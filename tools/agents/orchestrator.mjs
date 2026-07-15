import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROTECTED_BRANCHES,
  STATES,
  analyzeProject,
  branchNameFor,
  changedFiles,
  loadExecution,
  newExecution,
  run,
  runtimeFile,
  safeAddCommand,
  saveExecution,
  shellQuote,
  summarizeCommand,
  transition
} from "./core.mjs";

const MAX_SECURITY_FIXES = 3;
const MAX_TEST_FIXES = 3;

export async function startTask(root, request) {
  const execution = newExecution(root, request);
  await runFlow(root, execution);
  return loadExecution(root, execution.id);
}

export async function resumeTask(root, id) {
  const execution = loadExecution(root, id);
  await runFlow(root, execution);
  return loadExecution(root, id);
}

async function runFlow(root, execution) {
  try {
    if ([STATES.RECEIVED, STATES.ANALYZING_PROJECT].includes(execution.status)) {
      analyze(root, execution);
    }
    if ([STATES.CREATING_SPECIFICATION].includes(execution.status)) {
      poAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_DEVELOPMENT, STATES.DEVELOPING].includes(execution.status)) {
      developerAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_SECURITY_REVIEW, STATES.SECURITY_REVIEW].includes(execution.status)) {
      securityAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_TESTS, STATES.TESTING].includes(execution.status)) {
      testAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_DELIVERY, STATES.CREATING_COMMITS, STATES.PUSHING_BRANCH, STATES.CREATING_PULL_REQUEST].includes(execution.status)) {
      deliveryAgent(root, execution);
    }
  } catch (error) {
    execution.errors.push({ at: new Date().toISOString(), message: error.message });
    transition(root, execution, STATES.FAILED, error.message);
  }
}

function analyze(root, execution) {
  transition(root, execution, STATES.ANALYZING_PROJECT, "Analisando estrutura do projeto");
  execution.projectAnalysis = analyzeProject(root);
  execution.targetBranch = resolveTargetBranch(root);
  execution.branch = uniqueBranch(root, branchNameFor(execution.originalRequest));
  saveExecution(root, execution);
  transition(root, execution, STATES.CREATING_SPECIFICATION, "Analise concluida");
}

function poAgent(root, execution) {
  execution.currentAgent = "PO";
  const lower = execution.originalRequest.toLowerCase();
  const upload = lower.includes("upload") || lower.includes("imagem") || lower.includes("arquivo");
  execution.poOutput = {
    title: titleFromRequest(execution.originalRequest),
    summary: execution.originalRequest,
    projectContext: {
      backend: execution.projectAnalysis.backend,
      frontend: execution.projectAnalysis.frontend,
      database: execution.projectAnalysis.database,
      authentication: execution.projectAnalysis.authentication,
      authorization: execution.projectAnalysis.authorization
    },
    requirements: [
      "Preservar contratos existentes sempre que possivel.",
      "Implementar backend, frontend, validacoes e testes quando a solicitacao exigir.",
      "Manter logs sem segredos e sem dados sensiveis desnecessarios."
    ],
    businessRules: upload
      ? ["Arquivos devem respeitar tipo, tamanho, quantidade, permissao e armazenamento seguro."]
      : ["A regra de negocio deve ser documentada antes de alterar o codigo."],
    acceptanceCriteria: [
      "Usuario autorizado consegue executar o fluxo principal.",
      "Usuario sem permissao nao consegue acessar dados ou acoes indevidas.",
      "Lint/typecheck/testes/build obrigatorios passam antes da entrega."
    ],
    affectedModules: inferModules(execution.originalRequest),
    databaseChanges: upload ? ["Avaliar migration para metadados de anexos se o modelo existente nao atender."] : [],
    securityConsiderations: upload
      ? ["Validar extensao, MIME type, assinatura real, tamanho, path traversal e controle de acesso."]
      : ["Validar autorizacao, entrada de dados, vazamento de informacao e segredos."],
    testScenarios: ["Cenario positivo", "Permissao negada", "Entrada invalida", "Regressao de listagem/detalhe"],
    risks: ["Automacao local nao deve fazer merge, force push ou tocar em branches protegidas."]
  };
  saveExecution(root, execution);
  transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Especificacao criada pelo agente PO");
}

function developerAgent(root, execution) {
  execution.currentAgent = "DEVELOPER";
  transition(root, execution, STATES.DEVELOPING, "Preparando branch e implementacao");
  ensureWorkingTreeCanStart(root, execution);
  ensureTaskBranch(root, execution);

  const commandsExecuted = [];
  const promptFile = writeDeveloperPrompt(root, execution);
  const developerCommand = resolveDeveloperCommand(root, execution, promptFile);
  const developerDiagnostics = developerCommand ? [] : developerAutomationDiagnostics(root);
  if (developerCommand) {
    const result = run(developerCommand, {
      cwd: root,
      timeoutMs: Number(process.env.AGENTS_DEVELOPER_TIMEOUT_MS ?? 600000),
      env: developerEnvironment(root, execution, promptFile)
    });
    commandsExecuted.push(summarizeCommand(result));
    if (result.code !== 0) {
      execution.developerOutput = { status: "failed", commandsExecuted, knownLimitations: ["Comando de desenvolvimento retornou erro."] };
      saveExecution(root, execution);
      throw new Error("Agente desenvolvedor falhou ao executar o comando programador configurado.");
    }
  }

  const files = changedFiles(root);
  execution.developerOutput = {
    status: files.length > 0 ? "completed" : "waiting_for_external_implementation",
    branch: execution.branch,
    summary: files.length > 0
      ? "Alteracoes detectadas para revisao de seguranca e testes."
      : "Nenhuma alteracao de codigo detectada. Configure AGENTS_DEVELOPER_COMMAND ou implemente na branch e rode agents:resume.",
    changedFiles: files,
    createdFiles: files.filter((file) => run(`git ls-files --error-unmatch ${JSON.stringify(file)}`, { cwd: root }).code !== 0),
    databaseChanges: files.filter((file) => file.includes("src/main/resources/db/migration")),
    commandsExecuted,
    testsCreated: files.filter((file) => file.includes("/test/") || file.includes("\\test\\") || file.endsWith(".test.mjs")),
    testsExecuted: [],
    promptFile,
    developerAutomationEnabled: Boolean(developerCommand),
    developerDiagnostics,
    knownLimitations: developerCommand ? [] : developerDiagnostics
  };
  saveExecution(root, execution);

  if (files.length === 0) {
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Aguardando implementacao na branch");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_SECURITY_REVIEW, "Implementacao detectada");
}

export function developerAutomationDiagnostics(root) {
  const diagnostics = [
    "Braco programador nao configurado. Defina AGENTS_DEVELOPER_PROVIDER=codex ou AGENTS_DEVELOPER_COMMAND com {prompt}, {promptFile} ou {executionFile}."
  ];
  const codexVersion = run("codex --version", { cwd: root, timeoutMs: 15000 });
  if (codexVersion.code !== 0) {
    diagnostics.push(
      "Codex CLI nao esta acessivel pelo terminal. Instale/autentique o Codex CLI ou configure AGENTS_DEVELOPER_COMMAND para outro runner de IA."
    );
    if (codexVersion.stderr || codexVersion.stdout) {
      diagnostics.push(`Diagnostico codex --version: ${(codexVersion.stderr || codexVersion.stdout).split(/\r?\n/)[0]}`);
    }
  } else {
    diagnostics.push("Codex CLI parece disponivel. Configure AGENTS_DEVELOPER_PROVIDER=codex no .env da raiz e rode pnpm agents:resume <ID>.");
  }
  return diagnostics;
}

export function resolveDeveloperCommand(root, execution, promptFile) {
  if (process.env.AGENTS_DEVELOPER_COMMAND) {
    return renderDeveloperCommand(process.env.AGENTS_DEVELOPER_COMMAND, root, execution, promptFile);
  }

  if (process.env.AGENTS_DEVELOPER_PROVIDER === "codex") {
    return renderDeveloperCommand(
      "node tools/agents/codex-developer-runner.mjs {promptFile}",
      root,
      execution,
      promptFile
    );
  }

  return "";
}

export function renderDeveloperCommand(template, root, execution, promptFile) {
  const executionFile = runtimeFile(root, execution, "execution.json");
  const prompt = readFileSync(promptFile, "utf8");
  const replacements = {
    id: execution.id,
    branch: execution.branch,
    targetBranch: execution.targetBranch,
    request: execution.originalRequest,
    prompt,
    promptFile,
    executionFile,
    root
  };

  const referencesContext = template.includes("{prompt}") || template.includes("{promptFile}") || template.includes("{executionFile}");
  const rendered = Object.entries(replacements).reduce(
    (command, [key, value]) => command.replaceAll(`{${key}}`, shellQuote(value)),
    template
  );

  if (!referencesContext && process.env.AGENTS_DEVELOPER_ALLOW_RAW_COMMAND !== "true") {
    throw new Error("AGENTS_DEVELOPER_COMMAND deve usar {prompt}, {promptFile} ou {executionFile}. Use AGENTS_DEVELOPER_ALLOW_RAW_COMMAND=true para liberar comando bruto.");
  }

  return rendered;
}

function developerEnvironment(root, execution, promptFile) {
  const npmBin = process.env.APPDATA ? `${process.env.APPDATA}\\npm` : "";
  const pathKey = process.platform === "win32" ? "Path" : "PATH";
  const currentPath = process.env[pathKey] || process.env.PATH || "";
  return {
    [pathKey]: npmBin ? `${npmBin}${process.platform === "win32" ? ";" : ":"}${currentPath}` : currentPath,
    AGENTS_EXECUTION_ID: execution.id,
    AGENTS_EXECUTION_FILE: runtimeFile(root, execution, "execution.json"),
    AGENTS_DEVELOPER_PROMPT_FILE: promptFile,
    AGENTS_BRANCH: execution.branch,
    AGENTS_TARGET_BRANCH: execution.targetBranch,
    AGENTS_ORIGINAL_REQUEST: execution.originalRequest
  };
}

export function writeDeveloperPrompt(root, execution) {
  const promptFile = runtimeFile(root, execution, "developer-prompt.md");
  const content = `# Agente Desenvolvedor

Voce esta implementando uma tarefa no projeto NexusOS.

## Pedido original

${execution.originalRequest}

## Execucao

- ID: ${execution.id}
- Branch da tarefa: ${execution.branch}
- Branch de destino: ${execution.targetBranch}
- Arquivo de estado: ${runtimeFile(root, execution, "execution.json")}

## Especificacao do PO

\`\`\`json
${JSON.stringify(execution.poOutput, null, 2)}
\`\`\`

## Contexto tecnico

\`\`\`json
${JSON.stringify(execution.projectAnalysis, null, 2)}
\`\`\`

## Regras obrigatorias

- Trabalhe apenas dentro do repositorio.
- Nao use comandos destrutivos.
- Nao faca commit, push, merge ou Pull Request. O agente de entrega fara isso.
- Nao adicione tokens, senhas ou segredos.
- Preserve contratos existentes sempre que possivel.
- Crie ou ajuste testes quando a mudanca pedir.
- Ao terminar, deixe os arquivos alterados no working tree para o orquestrador revisar.

## Validacoes esperadas

- Backend: .\\\\mvnw.cmd test
- Frontend: npm --prefix nexusos-web run typecheck
- Frontend: npm --prefix nexusos-web run build
`;
  writeFileSync(promptFile, content);
  return promptFile;
}

function securityAgent(root, execution) {
  execution.currentAgent = "SECURITY";
  transition(root, execution, STATES.SECURITY_REVIEW, "Revisando seguranca");
  const files = changedFiles(root);
  const findings = [];
  for (const file of files) {
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    if (file.replace(/\\/g, "/") === "tools/agents/orchestrator.mjs") continue;
    const content = readFileSync(absolute, "utf8");
    if (/(ghp_|github_pat_|glpat-|PRIVATE KEY|BEGIN RSA|JWT_SECRET=|PASSWORD=)/i.test(content)) {
      findings.push({ severity: "CRITICAL", title: "Possivel segredo no codigo", description: "Padrao sensivel encontrado.", file, line: null, recommendation: "Remova o segredo e use variaveis de ambiente." });
    }
    if (/innerHTML|dangerouslySetInnerHTML/.test(content)) {
      findings.push({ severity: "MEDIUM", title: "Possivel XSS", description: "Renderizacao HTML direta encontrada.", file, line: null, recommendation: "Sanitize o conteudo ou use renderizacao segura." });
    }
    if (/\.\.[/\\]/.test(content)) {
      findings.push({ severity: "HIGH", title: "Possivel path traversal", description: "Uso de caminho relativo perigoso encontrado.", file, line: null, recommendation: "Normalize e valide caminhos dentro do diretorio permitido." });
    }
  }
  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.securityOutput = { status: rejected ? "rejected" : "approved", findings, approvedForTesting: !rejected };
  saveExecution(root, execution);
  if (rejected) {
    execution.securityFixAttempts = (execution.securityFixAttempts ?? 0) + 1;
    if (execution.securityFixAttempts > MAX_SECURITY_FIXES) {
      throw new Error("Limite de correcoes de seguranca excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Seguranca reprovada; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_TESTS, "Seguranca aprovada");
}

function testAgent(root, execution) {
  execution.currentAgent = "TESTS";
  transition(root, execution, STATES.TESTING, "Executando verificacoes");
  const commands = [];
  if (existsSync(join(root, "mvnw.cmd"))) {
    commands.push(process.platform === "win32" ? ".\\mvnw.cmd test" : "./mvnw test");
  }
  if (existsSync(join(root, "nexusos-web", "package.json"))) {
    const frontendUsesNpm = existsSync(join(root, "nexusos-web", "package-lock.json"));
    commands.push(frontendUsesNpm ? "npm --prefix nexusos-web run typecheck" : "pnpm --dir nexusos-web typecheck");
    commands.push(frontendUsesNpm ? "npm --prefix nexusos-web run build" : "pnpm --dir nexusos-web build");
  }
  const results = commands.map((command) => summarizeCommand(run(command, { cwd: root, timeoutMs: 900000 })));
  const failed = results.filter((item) => item.code !== 0);
  execution.testOutput = {
    status: failed.length ? "rejected" : "approved",
    summary: failed.length ? "Uma ou mais verificacoes falharam." : "Todas as verificacoes configuradas passaram.",
    testResults: { total: results.length, passed: results.length - failed.length, failed: failed.length, skipped: 0 },
    acceptanceCriteria: (execution.poOutput?.acceptanceCriteria ?? []).map((criterion) => ({
      criterion,
      status: failed.length ? "failed" : "passed",
      evidence: failed.length ? "Verificacoes automatizadas falharam." : "Verificacoes automatizadas aprovadas."
    })),
    failures: failed,
    commandsExecuted: results,
    approvedForDelivery: failed.length === 0
  };
  saveExecution(root, execution);
  if (failed.length) {
    execution.testFixAttempts = (execution.testFixAttempts ?? 0) + 1;
    if (execution.testFixAttempts > MAX_TEST_FIXES) {
      throw new Error("Limite de correcoes de testes excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Testes reprovados; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_DELIVERY, "Testes aprovados");
}

function deliveryAgent(root, execution) {
  execution.currentAgent = "DELIVERY";
  ensureBranchIsPushable(execution.branch);
  const files = changedFiles(root);
  if (files.length === 0) {
    transition(root, execution, STATES.FAILED, "Nao ha arquivos para commit");
    return;
  }
  transition(root, execution, STATES.CREATING_COMMITS, "Criando commit");
  const commands = [];
  commands.push(summarizeCommand(run("git status --short", { cwd: root })));
  commands.push(summarizeCommand(run(safeAddCommand(files), { cwd: root })));
  const message = conventionalTitle(execution.originalRequest);
  commands.push(summarizeCommand(run(`git commit -m ${JSON.stringify(message)}`, { cwd: root })));
  if (commands.at(-1).code !== 0) {
    throw new Error("Falha ao criar commit.");
  }
  transition(root, execution, STATES.PUSHING_BRANCH, "Enviando branch");
  commands.push(summarizeCommand(run(`git push -u origin ${execution.branch}`, { cwd: root, timeoutMs: 600000 })));
  if (commands.at(-1).code !== 0) {
    throw new Error("Falha ao fazer push da branch.");
  }
  transition(root, execution, STATES.CREATING_PULL_REQUEST, "Criando Pull Request");
  const ghVersion = run("gh --version", { cwd: root });
  const ghAuth = run("gh auth status", { cwd: root });
  commands.push(summarizeCommand(ghVersion), summarizeCommand(ghAuth));
  if (ghVersion.code !== 0 || ghAuth.code !== 0) {
    throw new Error("GitHub CLI ausente ou nao autenticado. Rode gh auth login ou configure GH_TOKEN/GITHUB_TOKEN.");
  }
  const bodyFile = runtimeFile(root, execution, "pull-request.md");
  writeFileSync(bodyFile, pullRequestBody(execution, files));
  const existing = run(`gh pr list --head ${execution.branch} --state open --json number,url,title`, { cwd: root });
  commands.push(summarizeCommand(existing));
  let prUrl = "";
  try {
    const prs = JSON.parse(existing.stdout || "[]");
    if (Array.isArray(prs) && prs[0]) {
      prUrl = prs[0].url;
      commands.push(summarizeCommand(run(`gh pr edit ${prs[0].number} --title ${JSON.stringify(message)} --body-file ${JSON.stringify(bodyFile)}`, { cwd: root })));
    }
  } catch {
    // Se a saida nao for JSON valida, tentaremos criar o PR abaixo.
  }
  if (!prUrl) {
    const created = run(`gh pr create --base ${execution.targetBranch} --head ${execution.branch} --title ${JSON.stringify(message)} --body-file ${JSON.stringify(bodyFile)}`, { cwd: root });
    commands.push(summarizeCommand(created));
    if (created.code !== 0) {
      throw new Error("Falha ao criar Pull Request no GitHub.");
    }
    prUrl = created.stdout.trim().split(/\r?\n/).at(-1) ?? "";
  }
  const checks = prUrl ? summarizeCommand(run(`gh pr checks ${JSON.stringify(prUrl)}`, { cwd: root, timeoutMs: 120000 })) : null;
  if (checks) commands.push(checks);
  execution.deliveryOutput = {
    status: "WAITING_FOR_HUMAN_REVIEW",
    provider: "github",
    remote: "origin",
    branch: execution.branch,
    targetBranch: execution.targetBranch,
    commitsCreated: true,
    push: "success",
    pullRequestCreated: true,
    pullRequestUrl: prUrl,
    mergePerformed: false,
    commandsExecuted: commands,
    checks
  };
  saveExecution(root, execution);
  transition(root, execution, STATES.WAITING_FOR_HUMAN_REVIEW, "Pull Request criado; aguardando revisao humana");
}

function resolveTargetBranch(root) {
  if (process.env.AGENTS_TARGET_BRANCH) return process.env.AGENTS_TARGET_BRANCH;
  const ghDefault = run("gh repo view --json defaultBranchRef --jq .defaultBranchRef.name", { cwd: root });
  if (ghDefault.code === 0 && ghDefault.stdout.trim()) return ghDefault.stdout.trim();
  const branches = run("git branch --list", { cwd: root }).stdout;
  if (branches.includes("develop")) return "develop";
  if (branches.includes("main")) return "main";
  return "master";
}

function uniqueBranch(root, base) {
  ensureBranchIsPushable(base);
  let branch = base;
  let index = 2;
  while (run(`git rev-parse --verify ${branch}`, { cwd: root }).code === 0) {
    branch = `${base}-${index}`;
    index += 1;
  }
  return branch;
}

function ensureWorkingTreeCanStart(root, execution) {
  const current = run("git branch --show-current", { cwd: root }).stdout.trim();
  if (current === execution.branch) return;
  const status = run("git status --short", { cwd: root }).stdout.trim();
  if (status) {
    throw new Error("Existem alteracoes locais antes de criar a branch da tarefa. Commit/stash antes de continuar.");
  }
}

function ensureTaskBranch(root, execution) {
  ensureBranchIsPushable(execution.branch);
  const current = run("git branch --show-current", { cwd: root }).stdout.trim();
  if (current === execution.branch) return;
  const fetch = run("git fetch origin", { cwd: root, timeoutMs: 600000 });
  if (fetch.code !== 0) throw new Error("Falha ao atualizar referencias remotas.");
  const checkout = run(`git checkout -b ${execution.branch}`, { cwd: root });
  if (checkout.code !== 0) throw new Error(`Falha ao criar branch ${execution.branch}.`);
}

function ensureBranchIsPushable(branch) {
  if (!branch || PROTECTED_BRANCHES.has(branch)) {
    throw new Error(`Branch protegida bloqueada para automacao: ${branch}`);
  }
}

function inferModules(request) {
  const lower = request.toLowerCase();
  const modules = [];
  if (lower.includes("os") || lower.includes("ordem")) modules.push("ordemservico", "nexusos-web/src/app/ordens-servico");
  if (lower.includes("cliente")) modules.push("cliente", "portalcliente");
  if (lower.includes("notifica")) modules.push("notificacao");
  if (lower.includes("dashboard")) modules.push("dashboard");
  return modules.length ? modules : ["backend", "frontend"];
}

function titleFromRequest(request) {
  const normalized = request.trim().replace(/\.$/, "");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function conventionalTitle(request) {
  return `feat: ${titleFromRequest(request).toLowerCase()}`.slice(0, 120);
}

function pullRequestBody(execution, files) {
  return `## Objetivo

${execution.originalRequest}

## Contexto do projeto

${execution.poOutput?.projectContext?.backend ?? ""}

## Alteracoes realizadas

- Implementacao na branch \`${execution.branch}\`
- Arquivos alterados revisados pelos agentes locais

## Backend

${files.some((file) => file.startsWith("src/")) ? "Houve alteracoes no backend." : "Sem alteracoes no backend."}

## Frontend

${files.some((file) => file.startsWith("nexusos-web/")) ? "Houve alteracoes no frontend." : "Sem alteracoes no frontend."}

## Banco de dados

${files.some((file) => file.includes("db/migration")) ? "Inclui migration de banco." : "Sem migrations."}

## Seguranca

Resultado: ${execution.securityOutput?.status ?? "nao executado"}

## Testes

Resultado: ${execution.testOutput?.status ?? "nao executado"}

## Como testar manualmente

1. Conferir os arquivos alterados.
2. Executar a aplicacao localmente.
3. Validar os criterios de aceitacao descritos pelo PO.

## Arquivos principais alterados

${files.map((file) => `- \`${file}\``).join("\n")}

## Decisoes tecnicas

- O merge nao e automatico.
- Pull Request criado via GitHub CLI.
- Runtime da execucao fica fora do commit em \`.agents/runtime\`.

## Limitacoes conhecidas

${(execution.developerOutput?.knownLimitations ?? []).map((item) => `- ${item}`).join("\n") || "- Nenhuma registrada."}

## Checklist

- [x] Implementacao concluida
- [x] Codigo revisado
- [x] Seguranca revisada
- [x] Verificacao de tipos/testes/build executados conforme configuracao local
- [x] Documentacao atualizada
- [ ] Revisao humana
- [ ] Merge
`;
}
