import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  STATES,
  analyzeProject,
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
const MAX_DATABASE_FIXES = 3;
const MAX_BUSINESS_RULE_FIXES = 3;
const MAX_TEST_FIXES = 3;
const MAX_DEPLOYMENT_FIXES = 3;

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
    if ([STATES.WAITING_FOR_DATABASE_REVIEW, STATES.DATABASE_REVIEW].includes(execution.status)) {
      databaseAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_BUSINESS_RULES_REVIEW, STATES.BUSINESS_RULES_REVIEW].includes(execution.status)) {
      businessRulesAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_UX_REVIEW, STATES.UX_REVIEW].includes(execution.status)) {
      uxAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_TESTS, STATES.TESTING].includes(execution.status)) {
      testAgent(root, execution);
    }
    if ([STATES.WAITING_FOR_DEPLOYMENT_REVIEW, STATES.DEPLOYMENT_REVIEW].includes(execution.status)) {
      deploymentAgent(root, execution);
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
  execution.branch = execution.targetBranch;
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
    risks: ["Automacao local deve commitar direto na branch alvo sem force push."]
  };
  saveExecution(root, execution);
  transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Especificacao criada pelo agente PO");
}

function developerAgent(root, execution) {
  execution.currentAgent = "DEVELOPER";
  transition(root, execution, STATES.DEVELOPING, "Preparando branch alvo e implementacao");
  ensureWorkingTreeCanStart(root, execution);
  ensureTaskBranch(root, execution);

  const commandsExecuted = [];
  const promptFile = writeDeveloperPrompt(root, execution);
  const developerCommand = resolveDeveloperCommand(root, execution, promptFile);
  const developerDiagnostics = developerCommand ? [] : developerAutomationDiagnostics(root);
  const headBeforeDeveloper = gitHead(root);
  if (developerCommand) {
    progress("Executando braco programador");
    const result = run(developerCommand, {
      cwd: root,
      timeoutMs: Number(process.env.AGENTS_DEVELOPER_TIMEOUT_MS ?? 600000),
      env: developerEnvironment(root, execution, promptFile)
    });
    commandsExecuted.push(summarizeCommand(result));
    progress(result.code === 0 ? "Braco programador finalizado" : "Braco programador falhou");
    if (result.code !== 0) {
      const filesAfterFailure = changedFiles(root);
      const headAfterFailure = gitHead(root);
      if (filesAfterFailure.length === 0 && headAfterFailure === headBeforeDeveloper) {
        execution.developerOutput = { status: "failed", commandsExecuted, knownLimitations: ["Comando de desenvolvimento retornou erro."] };
        saveExecution(root, execution);
        throw new Error("Agente desenvolvedor falhou ao executar o comando programador configurado.");
      }
      progress(
        headAfterFailure !== headBeforeDeveloper
          ? "Braco programador retornou erro, mas criou commit novo; seguindo para verificacoes"
          : "Braco programador retornou erro, mas deixou arquivos alterados; seguindo para verificacoes"
      );
    }
  }

  const headAfterDeveloper = gitHead(root);
  const developerCreatedCommit = headAfterDeveloper !== headBeforeDeveloper;
  const files = developerCreatedCommit
    ? filesChangedBetween(root, headBeforeDeveloper, headAfterDeveloper)
    : changedFiles(root);
  progressChangedFiles(files);
  execution.developerOutput = {
    status: files.length > 0 || developerCreatedCommit ? "completed" : "waiting_for_external_implementation",
    branch: execution.branch,
    summary: files.length > 0 || developerCreatedCommit
      ? "Alteracoes detectadas para revisao de seguranca e testes."
      : "Nenhuma alteracao de codigo detectada. Configure AGENTS_DEVELOPER_COMMAND ou implemente na branch alvo e rode agents:resume.",
    changedFiles: files,
    commitBefore: headBeforeDeveloper,
    commitAfter: headAfterDeveloper,
    commitCreatedByDeveloper: developerCreatedCommit,
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

  if (files.length === 0 && !developerCreatedCommit) {
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Aguardando implementacao na branch alvo");
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
- Branch de trabalho: ${execution.branch}
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
- Nao faca commit, push, merge ou Pull Request. O agente de entrega fara commit e push na branch alvo.
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
  const files = reviewFiles(root, execution);
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
  transition(root, execution, STATES.WAITING_FOR_DATABASE_REVIEW, "Seguranca aprovada");
}

function databaseAgent(root, execution) {
  execution.currentAgent = "DATABASE";
  transition(root, execution, STATES.DATABASE_REVIEW, "Revisando banco de dados");
  const files = reviewFiles(root, execution);
  const findings = [];
  const normalizedFiles = files.map(normalizePath);
  const migrationFiles = normalizedFiles.filter((file) => file.includes("src/main/resources/db/migration/"));

  for (const file of files) {
    const normalized = normalizePath(file);
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    if (!isDatabaseRelevantFile(normalized)) continue;
    const content = readFileSync(absolute, "utf8");
    findings.push(...databaseFindingsForFile(normalized, content, { migrationFiles }));
  }

  const entityChanged = files.some((file) => {
    const normalized = normalizePath(file);
    if (!normalized.startsWith("src/main/java/") || !normalized.endsWith(".java")) return false;
    const absolute = join(root, file);
    return existsSync(absolute) && /@Entity\b/.test(readFileSync(absolute, "utf8"));
  });

  if (entityChanged && migrationFiles.length === 0) {
    findings.push(databaseFinding(
      "HIGH",
      "Entidade JPA alterada sem migration",
      "src/main/java",
      "Mudancas no modelo persistido precisam de migration Flyway para manter ambientes sincronizados."
    ));
  }

  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.databaseOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: files.filter((file) => isDatabaseRelevantFile(normalizePath(file))),
    migrations: migrationFiles,
    findings,
    approvedForUx: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.databaseFixAttempts = (execution.databaseFixAttempts ?? 0) + 1;
    if (execution.databaseFixAttempts > MAX_DATABASE_FIXES) {
      throw new Error("Limite de correcoes de banco de dados excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Banco de dados reprovado; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_BUSINESS_RULES_REVIEW, "Banco de dados aprovado");
}

function businessRulesAgent(root, execution) {
  execution.currentAgent = "BUSINESS_RULES";
  transition(root, execution, STATES.BUSINESS_RULES_REVIEW, "Revisando regras de negocio");
  const files = reviewFiles(root, execution);
  const findings = [];
  const relevantFiles = files.filter((file) => isBusinessRuleRelevantFile(normalizePath(file)));
  const context = {
    allChangedFiles: files.map(normalizePath),
    testsCreated: execution.developerOutput?.testsCreated ?? []
  };

  for (const file of relevantFiles) {
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    const normalized = normalizePath(file);
    const content = readFileSync(absolute, "utf8");
    findings.push(...businessRuleFindingsForFile(normalized, content, context));
  }

  if (relevantFiles.length > 0 && context.testsCreated.length === 0 && !files.some((file) => normalizePath(file).includes("/test/"))) {
    findings.push(businessRuleFinding(
      "MEDIUM",
      "Mudanca de regra sem teste associado",
      "tests",
      "Fluxos de OS, cliente, pagamento e permissao precisam de teste quando a regra muda."
    ));
  }

  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.businessRulesOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: relevantFiles,
    findings,
    approvedForUx: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.businessRuleFixAttempts = (execution.businessRuleFixAttempts ?? 0) + 1;
    if (execution.businessRuleFixAttempts > MAX_BUSINESS_RULE_FIXES) {
      throw new Error("Limite de correcoes de regras de negocio excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Regras de negocio reprovadas; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_UX_REVIEW, "Regras de negocio aprovadas");
}

function uxAgent(root, execution) {
  execution.currentAgent = "UX";
  transition(root, execution, STATES.UX_REVIEW, "Revisando experiencia do usuario");
  const files = reviewFiles(root, execution);
  const frontendFiles = files.filter((file) => normalizePath(file).startsWith("nexusos-web/src/"));
  const findings = [];

  for (const file of frontendFiles) {
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    const content = readFileSync(absolute, "utf8");
    const normalized = normalizePath(file);
    const isPageOrComponent = /\.(tsx|jsx)$/.test(normalized);
    if (!isPageOrComponent) continue;

    if (/overflow-x-auto|overflow-auto/.test(content) && /<Table|<table/.test(content) && !/md:|lg:|hidden md|md:hidden|grid gap|Card/.test(content)) {
      findings.push(uxFinding("HIGH", "Tabela sem alternativa clara para mobile", file, "Listas grandes precisam ter visual em cards ou layout responsivo alem de rolagem horizontal."));
    }
    if (/<Dialog|<AlertDialog/.test(content) && content.length > 30000 && !/max-h-\[|overflow-y-auto|Sheet/.test(content)) {
      findings.push(uxFinding("MEDIUM", "Modal grande pode dificultar uso no mobile", file, "Fluxos longos devem virar tela dedicada ou modal com altura controlada e rolagem interna."));
    }
    if (/<Button[^>]*>\s*(Excluir|Cancelar|Reabrir|Finalizar|Aprovar|Reprovar)/.test(content) && !/CriticalActionDialog|AlertDialog/.test(content)) {
      findings.push(uxFinding("MEDIUM", "Acao importante sem confirmacao evidente", file, "Acoes irreversiveis ou sensiveis precisam de confirmacao clara antes de executar."));
    }
    if (/text-xs[^"\n]*(?:text-muted-foreground)/.test(content) && /Portal do Cliente|cliente/i.test(content) && !/text-sm|leading-/.test(content)) {
      findings.push(uxFinding("LOW", "Texto de apoio pode estar pequeno para cliente", file, "Conteudos de decisao do cliente devem priorizar leitura confortavel em mobile."));
    }
    if (/\bstatus\b|\bprioridade\b|\bsequencia\b/i.test(content) && /portal\/cliente|PortalCliente/.test(content)) {
      findings.push(uxFinding("LOW", "Possivel linguagem tecnica no portal do cliente", file, "No portal, prefira textos orientados a decisao como proximo passo, pagamento, aprovacao ou ajuste."));
    }
    if (/className="[^"]*(grid|flex)[^"]*"/.test(content) && !/(sm:|md:|lg:|xl:)/.test(content) && content.length > 18000) {
      findings.push(uxFinding("LOW", "Layout extenso com poucos breakpoints responsivos", file, "Telas densas devem declarar comportamento para mobile, tablet e desktop."));
    }
  }

  const rejected = findings.some((item) => item.severity === "HIGH");
  execution.uxOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: frontendFiles,
    findings,
    approvedForTesting: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.uxFixAttempts = (execution.uxFixAttempts ?? 0) + 1;
    if (execution.uxFixAttempts > MAX_TEST_FIXES) {
      throw new Error("Limite de correcoes de UX excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "UX reprovada; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_TESTS, "UX aprovada");
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
  const results = commands.map((command) => {
    progress(`Executando: ${command}`);
    const result = summarizeCommand(run(command, { cwd: root, timeoutMs: 900000 }));
    progress(result.code === 0 ? `Aprovado: ${command}` : `Falhou: ${command}`);
    return result;
  });
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
  transition(root, execution, STATES.WAITING_FOR_DEPLOYMENT_REVIEW, "Testes aprovados");
}

function deploymentAgent(root, execution) {
  execution.currentAgent = "DEPLOYMENT";
  transition(root, execution, STATES.DEPLOYMENT_REVIEW, "Revisando deploy e producao");
  const files = reviewFiles(root, execution);
  const findings = [];
  const relevantFiles = files.filter((file) => isDeploymentRelevantFile(normalizePath(file)));

  for (const file of relevantFiles) {
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    const normalized = normalizePath(file);
    const content = readFileSync(absolute, "utf8");
    findings.push(...deploymentFindingsForFile(normalized, content));
  }

  const hasBackendChange = files.some((file) => normalizePath(file).startsWith("src/main/"));
  const hasFrontendChange = files.some((file) => normalizePath(file).startsWith("nexusos-web/src/"));
  const hasDeploymentChange = relevantFiles.length > 0;
  if ((hasBackendChange || hasFrontendChange) && !hasDeploymentChange) {
    findings.push(deploymentFinding(
      "LOW",
      "Mudanca de aplicacao sem arquivo de deploy revisado",
      "deploy",
      "Quando a mudanca altera env, porta, build, URL publica ou dependencia, revise Docker/Compose/Nginx antes de publicar."
    ));
  }

  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.deploymentOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: relevantFiles,
    findings,
    approvedForDelivery: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.deploymentFixAttempts = (execution.deploymentFixAttempts ?? 0) + 1;
    if (execution.deploymentFixAttempts > MAX_DEPLOYMENT_FIXES) {
      throw new Error("Limite de correcoes de deploy/producao excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Deploy/producao reprovado; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_DELIVERY, "Deploy/producao aprovado");
}

function deliveryAgent(root, execution) {
  execution.currentAgent = "DELIVERY";
  const files = changedFiles(root);
  const developerCreatedCommit = Boolean(execution.developerOutput?.commitCreatedByDeveloper);
  if (files.length === 0 && !developerCreatedCommit) {
    transition(root, execution, STATES.FAILED, "Nao ha arquivos para commit");
    return;
  }
  const commands = [];
  commands.push(summarizeCommand(run("git status --short", { cwd: root })));
  const reportFile = runtimeFile(root, execution, "delivery-report.md");
  writeFileSync(reportFile, deliveryReport(execution, files));
  if (files.length > 0) {
    transition(root, execution, STATES.CREATING_COMMITS, "Criando commit");
    commands.push(summarizeCommand(run(safeAddCommand(files), { cwd: root })));
    const message = conventionalTitle(execution.originalRequest);
    commands.push(summarizeCommand(run(`git commit -m ${JSON.stringify(message)}`, { cwd: root })));
    if (commands.at(-1).code !== 0) {
      throw new Error("Falha ao criar commit.");
    }
  } else {
    transition(root, execution, STATES.CREATING_COMMITS, "Commit ja criado pelo braco programador");
  }
  transition(root, execution, STATES.PUSHING_BRANCH, `Enviando commit para ${execution.branch}`);
  commands.push(summarizeCommand(run(`git push origin ${execution.branch}`, { cwd: root, timeoutMs: 600000 })));
  if (commands.at(-1).code !== 0) {
    throw new Error(`Falha ao fazer push para ${execution.branch}.`);
  }
  execution.deliveryOutput = {
    status: "COMPLETED",
    provider: "github",
    remote: "origin",
    branch: execution.branch,
    targetBranch: execution.targetBranch,
    commitsCreated: true,
    push: "success",
    pullRequestCreated: false,
    pullRequestUrl: "",
    mergePerformed: false,
    commandsExecuted: commands,
    checks: null
  };
  saveExecution(root, execution);
  transition(root, execution, STATES.COMPLETED, `Commit enviado para ${execution.branch}`);
}

function resolveTargetBranch(root) {
  if (process.env.AGENTS_TARGET_BRANCH) return process.env.AGENTS_TARGET_BRANCH;
  const branches = run("git branch --list", { cwd: root }).stdout;
  if (branches.includes("master")) return "master";
  if (branches.includes("main")) return "main";
  const current = run("git branch --show-current", { cwd: root }).stdout.trim();
  if (current) return current;
  return "master";
}

function ensureWorkingTreeCanStart(root, execution) {
  const current = run("git branch --show-current", { cwd: root }).stdout.trim();
  if (current === execution.branch) return;
  const status = run("git status --short", { cwd: root }).stdout.trim();
  if (status) {
    throw new Error("Existem alteracoes locais antes de trocar para a branch alvo. Commit/stash antes de continuar.");
  }
}

function ensureTaskBranch(root, execution) {
  const current = run("git branch --show-current", { cwd: root }).stdout.trim();
  if (current === execution.branch) return;
  const fetch = run("git fetch origin", { cwd: root, timeoutMs: 600000 });
  if (fetch.code !== 0) throw new Error("Falha ao atualizar referencias remotas.");
  const checkout = run(`git checkout ${execution.branch}`, { cwd: root });
  if (checkout.code !== 0) throw new Error(`Falha ao acessar branch ${execution.branch}.`);
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

function normalizePath(file) {
  return file.replace(/\\/g, "/");
}

function reviewFiles(root, execution) {
  const files = changedFiles(root);
  return files.length ? files : (execution.developerOutput?.changedFiles ?? []);
}

function isDatabaseRelevantFile(file) {
  return (
    file.includes("src/main/resources/db/migration/") ||
    file.endsWith("application.properties") ||
    file.endsWith("application.yml") ||
    file.endsWith("application.yaml") ||
    (file.startsWith("src/main/java/") && /\.(java)$/.test(file) && /(entity|repository|service|ordemservico|cliente|usuario|pagamento|auditoria|notificacao)/i.test(file))
  );
}

function isBusinessRuleRelevantFile(file) {
  return (
    file.startsWith("src/main/java/") && /\.(java)$/.test(file) && /(ordemservico|status|portalcliente|cliente|pagamento|aprovacao|auditoria|notificacao|usuario|permissao|auth|dashboard)/i.test(file)
  ) || (
    file.startsWith("nexusos-web/src/") && /\.(ts|tsx|jsx)$/.test(file) && /(ordens-servico|portal|cliente|dashboard|notificacoes|usuarios|auth|services)/i.test(file)
  );
}

function isDeploymentRelevantFile(file) {
  return (
    file === "Dockerfile" ||
    /^docker-compose.*\.ya?ml$/.test(file) ||
    file.includes("/Dockerfile") ||
    file.includes("nginx") ||
    file.endsWith(".env.example") ||
    file.endsWith("application.yaml") ||
    file.endsWith("application.yml") ||
    file.endsWith("application.properties") ||
    file.endsWith("next.config.ts") ||
    file.endsWith("next.config.js") ||
    file === "package.json" ||
    file === "pom.xml" ||
    file === "nexusos-web/package.json" ||
    file === "nexusos-web/.env.example"
  );
}

export function deploymentFindingsForFile(file, content) {
  const findings = [];
  const isCompose = /^docker-compose.*\.ya?ml$/.test(file);
  const isDockerfile = file.endsWith("Dockerfile");
  const isEnvExample = file.endsWith(".env.example");
  const isApplicationConfig = /application(?:-[\w-]+)?\.(ya?ml|properties)$/.test(file);

  if (/(PASSWORD|TOKEN|SECRET|PRIVATE_KEY|ACCESS_TOKEN)=([^\s#]+)$/gim.test(content) && !isEnvExample) {
    findings.push(deploymentFinding(
      "CRITICAL",
      "Possivel segredo em arquivo versionavel",
      file,
      "Valores sensiveis devem ficar apenas em variaveis de ambiente reais, nunca em arquivos versionados."
    ));
  }

  if (/(localhost|127\.0\.0\.1|host\.docker\.internal)/i.test(content) && /(NEXT_PUBLIC|API_PUBLIC_URL|FRONTEND_BASE_URL|CORS_ALLOWED_ORIGINS|DATABASE_JDBC_URL)/i.test(content)) {
    findings.push(deploymentFinding(
      "HIGH",
      "URL publica apontando para ambiente local",
      file,
      "Variaveis publicas de producao devem usar o dominio final HTTPS, nao localhost ou IP local."
    ));
  }

  if (/\bNEXT_PUBLIC_API_URL\s*[:=]\s*http:\/\//i.test(content) || /\bAPI_PUBLIC_URL\s*[:=]\s*http:\/\//i.test(content)) {
    findings.push(deploymentFinding(
      "MEDIUM",
      "URL publica sem HTTPS",
      file,
      "Em producao, use HTTPS para frontend e API, especialmente atras de Cloudflare ou Nginx."
    ));
  }

  if (/(CORS_ALLOWED_ORIGINS|allowed-origins)\s*[:=]\s*(\*|http:\/\/\*)/i.test(content)) {
    findings.push(deploymentFinding(
      "HIGH",
      "CORS aberto demais",
      file,
      "Restrinja CORS ao dominio oficial do frontend e evite wildcard em producao."
    ));
  }

  if (isApplicationConfig && /springdoc\.swagger-ui\.enabled\s*[:=]\s*true/i.test(content) && /(prod|production)/i.test(file + content)) {
    findings.push(deploymentFinding(
      "HIGH",
      "Swagger habilitado em producao",
      file,
      "Bloqueie Swagger em prod ou exponha somente atras de autenticacao/rede administrativa."
    ));
  }

  if (isCompose && /image:\s*[\w./-]+(?::latest)?\s*$/im.test(content)) {
    findings.push(deploymentFinding(
      "MEDIUM",
      "Imagem Docker sem versao fixa",
      file,
      "Use tags explicitas para builds reproduziveis e rollback previsivel."
    ));
  }

  if (isCompose && /-\s*["']?5432:5432["']?/i.test(content)) {
    findings.push(deploymentFinding(
      "HIGH",
      "PostgreSQL publicado para fora do Docker",
      file,
      "Evite expor a porta 5432 publicamente; deixe o banco acessivel apenas pela rede interna do Compose."
    ));
  }

  if (isCompose && /postgres/i.test(content) && !/volumes:\s*[\s\S]*postgres/i.test(content)) {
    findings.push(deploymentFinding(
      "HIGH",
      "PostgreSQL sem volume persistente evidente",
      file,
      "Banco em producao precisa de volume persistente e politica de backup."
    ));
  }

  if (isCompose && !/restart:\s*(unless-stopped|always)/i.test(content)) {
    findings.push(deploymentFinding(
      "MEDIUM",
      "Servico sem politica de restart",
      file,
      "Configure restart em containers de producao para recuperar apos reboot/falha simples."
    ));
  }

  if (isCompose && /build:/i.test(content) && !/(healthcheck:|depends_on:[\s\S]*condition:\s*service_healthy)/i.test(content)) {
    findings.push(deploymentFinding(
      "LOW",
      "Compose sem healthcheck claro",
      file,
      "Healthchecks ajudam Nginx, dependencias e automacoes a detectar containers indisponiveis."
    ));
  }

  if (isDockerfile && !/^\s*USER\s+\S+/im.test(content)) {
    findings.push(deploymentFinding(
      "MEDIUM",
      "Dockerfile roda como root por padrao",
      file,
      "Crie usuario nao-root no container quando a imagem permitir."
    ));
  }

  if (isDockerfile && !/^\s*HEALTHCHECK\b/im.test(content)) {
    findings.push(deploymentFinding(
      "LOW",
      "Dockerfile sem HEALTHCHECK",
      file,
      "Considere healthcheck para detectar aplicacao travada mesmo com container ativo."
    ));
  }

  if (/proxy_pass/i.test(content) && !/X-Forwarded-Proto/i.test(content)) {
    findings.push(deploymentFinding(
      "MEDIUM",
      "Proxy sem X-Forwarded-Proto",
      file,
      "Configure headers X-Forwarded-* para a aplicacao gerar URLs e cookies corretos atras do Nginx/Cloudflare."
    ));
  }

  if (/server_name\s+_/i.test(content)) {
    findings.push(deploymentFinding(
      "LOW",
      "Nginx com server_name generico",
      file,
      "Use o dominio real em producao para evitar roteamento ambiguo entre projetos."
    ));
  }

  return findings;
}

function deploymentFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "DEPLOYMENT"
  };
}

export function businessRuleFindingsForFile(file, content, context = {}) {
  const findings = [];
  const isJava = file.endsWith(".java");
  const isFrontend = /\.(ts|tsx|jsx)$/.test(file);
  const lowerFile = file.toLowerCase();

  if (isJava && /setStatus\s*\(/.test(content) && !/(auditoria|historico|registrar[a-zA-Z]*Auditoria|notifica|notificacao)/i.test(content)) {
    findings.push(businessRuleFinding(
      "HIGH",
      "Alteracao de status sem rastreabilidade",
      file,
      "Toda mudanca de status da OS deve gerar auditoria e, quando fizer sentido, notificacao para os envolvidos."
    ));
  }

  if (isJava && /(cancelar|reabrir|reprovar|aprovar|finalizar)[a-zA-Z0-9_]*\s*\(/i.test(content) && !/(motivo|descricao|observacao|justificativa)/i.test(content)) {
    findings.push(businessRuleFinding(
      "HIGH",
      "Acao critica sem justificativa",
      file,
      "Cancelamento, reabertura, reprovacao, aprovacao e finalizacao devem registrar motivo, descricao ou observacao."
    ));
  }

  if (isJava && /(cancelar|reabrir|aprovar|reprovar|finalizar|atribuir)[a-zA-Z0-9_]*\s*\(/i.test(content) && !/(@PreAuthorize|hasRole|hasAuthority|authentication|usuarioLogado|permiss)/i.test(content)) {
    findings.push(businessRuleFinding(
      "HIGH",
      "Acao sensivel sem regra de permissao evidente",
      file,
      "Acoes de OS devem deixar claro quem pode executar: admin, desenvolvedor responsavel ou cliente pelo portal publico."
    ));
  }

  if (isJava && /(FINALIZADA|CANCELADA)/.test(content) && /setStatus\s*\(/.test(content) && !/(nao pode|bloque|validar|transicao|TRANSICOES|statusPermitido|podeAvancar)/i.test(content)) {
    findings.push(businessRuleFinding(
      "MEDIUM",
      "Fluxo terminal pode permitir avanco indevido",
      file,
      "Status finais como FINALIZADA e CANCELADA devem bloquear avanco normal e exigir fluxo especifico para reabertura."
    ));
  }

  if (isJava && /StatusOrdemServico|enum\s+\w*Status/i.test(content) && !/(TRANSICOES|proximo|permitid|workflow|pode)/i.test(content)) {
    findings.push(businessRuleFinding(
      "MEDIUM",
      "Status sem transicoes explicitas",
      file,
      "Ao incluir ou alterar status, atualize a matriz de transicoes e os fluxos de tela/API."
    ));
  }

  if (isJava && /(valor|pagamento|cobranca)/i.test(content) && /(cliente|portal)/i.test(content) && !/(admin|aprovad|permiss|visivel|ocultar)/i.test(content)) {
    findings.push(businessRuleFinding(
      "MEDIUM",
      "Regra financeira no portal precisa de limite claro",
      file,
      "Campos financeiros devem deixar claro o que o cliente pode ver e o que fica restrito ao admin."
    ));
  }

  if (isFrontend && /portal/i.test(lowerFile) && /(valorPrevisto|cobrar|cobranca|responsavel|prazo|ultimaAtualizacao|updatedAt)/.test(content)) {
    findings.push(businessRuleFinding(
      "HIGH",
      "Portal do cliente expondo campo interno",
      file,
      "O portal deve mostrar somente informacoes uteis para decisao do cliente, evitando prazo interno, cobranca tecnica e responsavel interno."
    ));
  }

  if (isFrontend && /(aprovar|reprovar|cancelar|reabrir|finalizar)/i.test(content) && !/(confirm|motivo|reason|observacao|descricao|justificativa|Dialog|AlertDialog)/i.test(content)) {
    findings.push(businessRuleFinding(
      "MEDIUM",
      "Acao critica na interface sem coleta/confirmacao",
      file,
      "Acoes importantes devem confirmar intencao e coletar motivo quando alteram o fluxo da OS."
    ));
  }

  if (isFrontend && /(admin|desenvolvedor|cliente)/i.test(content) && /(role|perfil|tipoUsuario)/i.test(content) && !/(can|pode|permiss|isAdmin|isDeveloper|isCliente)/i.test(content)) {
    findings.push(businessRuleFinding(
      "LOW",
      "Permissao de tela pouco explicita",
      file,
      "Prefira helpers claros de permissao para evitar divergencia entre frontend e backend."
    ));
  }

  if ((context.allChangedFiles ?? []).some((changedFile) => /StatusOrdemServico|status-ordem|ordem-servico-status/i.test(changedFile)) && /dashboard|notificacao/i.test(lowerFile) && !/(FINALIZADA|CANCELADA|APROVADA|REPROVADA|EM_DESENVOLVIMENTO|AGUARDANDO_APROVACAO)/.test(content)) {
    findings.push(businessRuleFinding(
      "LOW",
      "Tela auxiliar pode nao refletir novos status",
      file,
      "Quando status mudam, revise dashboard, notificacoes, filtros e listagens relacionadas."
    ));
  }

  return findings;
}

function businessRuleFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "BUSINESS_RULES"
  };
}

export function databaseFindingsForFile(file, content, context = {}) {
  const findings = [];
  const isMigration = file.includes("src/main/resources/db/migration/");
  const migrationName = file.split("/").at(-1) ?? file;

  if (isMigration && !/^V\d+__[\w-]+\.sql$/.test(migrationName)) {
    findings.push(databaseFinding(
      "HIGH",
      "Migration fora do padrao Flyway",
      file,
      "Use o padrao V<numero>__descricao.sql para manter ordem previsivel e rastreavel."
    ));
  }

  if (isMigration && /\b(DROP\s+DATABASE|DROP\s+SCHEMA|DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i.test(content)) {
    findings.push(databaseFinding(
      "CRITICAL",
      "Migration destrutiva detectada",
      file,
      "Evite apagar estruturas em migrations de produto; crie estrategia reversivel, backup ou migracao em fases."
    ));
  }

  if (isMigration && /\bALTER\s+TABLE\b[\s\S]{0,300}\bDROP\s+COLUMN\b/i.test(content)) {
    findings.push(databaseFinding(
      "HIGH",
      "Remocao de coluna em migration",
      file,
      "Prefira descontinuar a coluna em fases, migrar dados e remover somente apos janela controlada."
    ));
  }

  if (isMigration && /\bDELETE\s+FROM\b(?![\s\S]{0,200}\bWHERE\b)/i.test(content)) {
    findings.push(databaseFinding(
      "HIGH",
      "DELETE sem filtro aparente",
      file,
      "Inclua WHERE, justificativa e estrategia de backup para alteracoes de dados."
    ));
  }

  if (isMigration && /\bALTER\s+TABLE\b[\s\S]{0,300}\bADD\s+COLUMN\b[\s\S]{0,200}\bNOT\s+NULL\b/i.test(content) && !/\bDEFAULT\b/i.test(content)) {
    findings.push(databaseFinding(
      "MEDIUM",
      "Coluna NOT NULL sem default",
      file,
      "Em tabelas existentes, adicione default/backfill antes de aplicar NOT NULL para evitar falha em producao."
    ));
  }

  if (isMigration && /\bCREATE\s+TABLE\b/i.test(content) && !/\bCREATE\s+(INDEX|UNIQUE\s+INDEX)\b/i.test(content)) {
    findings.push(databaseFinding(
      "LOW",
      "Tabela nova sem indice explicito",
      file,
      "Revise se campos usados em busca, filtros ou joins precisam de indice desde a criacao."
    ));
  }

  if (/\bspring\.jpa\.hibernate\.ddl-auto\s*[:=]\s*(update|create|create-drop)\b/i.test(content)) {
    findings.push(databaseFinding(
      "HIGH",
      "DDL automatico perigoso habilitado",
      file,
      "Use Flyway como fonte de verdade do schema e mantenha ddl-auto como validate ou none em ambientes controlados."
    ));
  }

  if (/nativeQuery\s*=\s*true/i.test(content) && /"\s*\+|\+\s*"/.test(content)) {
    findings.push(databaseFinding(
      "HIGH",
      "SQL nativo concatenado",
      file,
      "Use parametros nomeados/posicionais para evitar injection e planos instaveis."
    ));
  }

  if (/@Query\s*\(/.test(content) && /\bSELECT\s+\*\b/i.test(content)) {
    findings.push(databaseFinding(
      "MEDIUM",
      "Query selecionando todas as colunas",
      file,
      "Prefira projecoes ou campos explicitos quando a consulta alimentar listas ou relatorios."
    ));
  }

  if (/@Entity\b/.test(content) && (context.migrationFiles ?? []).length === 0 && /@(Column|ManyToOne|OneToMany|JoinColumn)\b/.test(content)) {
    findings.push(databaseFinding(
      "MEDIUM",
      "Entidade persistida sem migration relacionada",
      file,
      "Confirme se a mudanca nao altera schema; se alterar, inclua migration Flyway."
    ));
  }

  return findings;
}

function databaseFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "DATABASE"
  };
}

function uxFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "UX"
  };
}

function titleFromRequest(request) {
  const normalized = request.trim().replace(/\.$/, "");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function gitHead(root) {
  const result = run("git rev-parse HEAD", { cwd: root });
  return result.code === 0 ? result.stdout.trim() : "";
}

function filesChangedBetween(root, before, after) {
  if (!before || !after || before === after) return [];
  const result = run(`git diff --name-only ${before} ${after}`, { cwd: root });
  return result.code === 0
    ? result.stdout.split(/\r?\n/).map((file) => file.trim()).filter(Boolean)
    : [];
}

function progress(message) {
  if (process.env.AGENTS_PROGRESS === "1") {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
  }
}

function progressChangedFiles(files) {
  if (process.env.AGENTS_PROGRESS !== "1") return;
  if (files.length === 0) {
    progress("Nenhum arquivo alterado pelo braco programador");
    return;
  }
  progress(`${files.length} arquivo${files.length === 1 ? "" : "s"} alterado${files.length === 1 ? "" : "s"} pelo braco programador:`);
  for (const file of files) {
    console.log(`  - ${file}`);
  }
}

function conventionalTitle(request) {
  return `feat: ${titleFromRequest(request).toLowerCase()}`.slice(0, 120);
}

function deliveryReport(execution, files) {
  const reportFiles = files.length
    ? files
    : (execution.developerOutput?.changedFiles ?? []);
  return `## Objetivo

${execution.originalRequest}

## Contexto do projeto

${execution.poOutput?.projectContext?.backend ?? ""}

## Alteracoes realizadas

- Implementacao commitada diretamente na branch \`${execution.branch}\`
- Arquivos alterados revisados pelos agentes locais

## Backend

${files.some((file) => file.startsWith("src/")) ? "Houve alteracoes no backend." : "Sem alteracoes no backend."}

## Frontend

${files.some((file) => file.startsWith("nexusos-web/")) ? "Houve alteracoes no frontend." : "Sem alteracoes no frontend."}

## Banco de dados

${files.some((file) => file.includes("db/migration")) ? "Inclui migration de banco." : "Sem migrations."}

## Seguranca

Resultado: ${execution.securityOutput?.status ?? "nao executado"}

## Banco de dados

Resultado: ${execution.databaseOutput?.status ?? "nao executado"}

## Regras de negocio

Resultado: ${execution.businessRulesOutput?.status ?? "nao executado"}

## Deploy e producao

Resultado: ${execution.deploymentOutput?.status ?? "nao executado"}

## Testes

Resultado: ${execution.testOutput?.status ?? "nao executado"}

## Como testar manualmente

1. Conferir os arquivos alterados.
2. Executar a aplicacao localmente.
3. Validar os criterios de aceitacao descritos pelo PO.

## Arquivos principais alterados

${reportFiles.map((file) => `- \`${file}\``).join("\n") || "- Alteracoes ja estavam commitadas pelo braco programador."}

## Decisoes tecnicas

- O fluxo atual commita e envia direto para a branch alvo.
- Pull Request nao e criado nesse modo.
- Runtime da execucao fica fora do commit em \`.agents/runtime\`.

## Limitacoes conhecidas

${(execution.developerOutput?.knownLimitations ?? []).map((item) => `- ${item}`).join("\n") || "- Nenhuma registrada."}

## Checklist

- [x] Implementacao concluida
- [x] Codigo revisado
- [x] Seguranca revisada
- [x] Banco de dados revisado
- [x] Regras de negocio revisadas
- [x] Verificacao de tipos/testes/build executados conforme configuracao local
- [x] Deploy/producao revisado
- [x] Documentacao atualizada
- [x] Commit criado
- [x] Push realizado
`;
}
