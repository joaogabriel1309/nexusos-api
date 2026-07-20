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
const MAX_PRODUCT_FIXES = 3;
const MAX_TEST_FIXES = 3;
const MAX_DEPLOYMENT_FIXES = 3;
const MAX_ACCESSIBILITY_FIXES = 3;
const MAX_PERFORMANCE_FIXES = 3;
const MAX_DOCUMENTATION_FIXES = 3;

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
    for (let cycle = 0; cycle < 30; cycle += 1) {
      const statusBefore = execution.status;
      const historyLengthBefore = execution.history?.length ?? 0;

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
      if ([STATES.WAITING_FOR_PRODUCT_REVIEW, STATES.PRODUCT_REVIEW].includes(execution.status)) {
        productAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_UX_REVIEW, STATES.UX_REVIEW].includes(execution.status)) {
        uxAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_ACCESSIBILITY_REVIEW, STATES.ACCESSIBILITY_REVIEW].includes(execution.status)) {
        accessibilityAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_PERFORMANCE_REVIEW, STATES.PERFORMANCE_REVIEW].includes(execution.status)) {
        performanceAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_TESTS, STATES.TESTING].includes(execution.status)) {
        testAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_DEPLOYMENT_REVIEW, STATES.DEPLOYMENT_REVIEW].includes(execution.status)) {
        deploymentAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_MANUAL_QA_REVIEW, STATES.MANUAL_QA_REVIEW].includes(execution.status)) {
        manualQaAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_DOCUMENTATION_REVIEW, STATES.DOCUMENTATION_REVIEW].includes(execution.status)) {
        documentationAgent(root, execution);
      }
      if ([STATES.WAITING_FOR_DELIVERY, STATES.CREATING_COMMITS, STATES.PUSHING_BRANCH, STATES.CREATING_PULL_REQUEST].includes(execution.status)) {
        deliveryAgent(root, execution);
      }

      if (execution.status === STATES.WAITING_FOR_DEVELOPMENT && shouldAutoRetryDevelopment(execution)) {
        progress("Revisao reprovada; retornando automaticamente ao braco programador");
        continue;
      }

      const historyLengthAfter = execution.history?.length ?? 0;
      if (execution.status === statusBefore && historyLengthAfter === historyLengthBefore) {
        break;
      }
      if (![STATES.WAITING_FOR_DEVELOPMENT, STATES.DEVELOPING].includes(execution.status)) {
        break;
      }
    }
  } catch (error) {
    execution.errors.push({ at: new Date().toISOString(), message: error.message });
    transition(root, execution, STATES.FAILED, error.message);
  }
}

function shouldAutoRetryDevelopment(execution) {
  if (!developerAutomationConfigured()) return false;
  return execution.developerOutput?.status !== "waiting_for_external_implementation";
}

function developerAutomationConfigured() {
  return Boolean(process.env.AGENTS_DEVELOPER_COMMAND || process.env.AGENTS_DEVELOPER_PROVIDER === "codex");
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

${developerReviewContext(execution)}

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

function developerReviewContext(execution) {
  const reviews = [
    ["Seguranca", execution.securityOutput],
    ["Banco de Dados", execution.databaseOutput],
    ["Regras de Negocio", execution.businessRulesOutput],
    ["Produto", execution.productOutput],
    ["UX", execution.uxOutput],
    ["Acessibilidade", execution.accessibilityOutput],
    ["Performance", execution.performanceOutput],
    ["Testes", execution.testOutput],
    ["Deploy/Producao", execution.deploymentOutput],
    ["Documentacao", execution.documentationOutput]
  ];
  const rejected = reviews
    .filter(([, output]) => output?.status === "rejected")
    .map(([agent, output]) => ({
      agente: agent,
      achados: output.findings ?? output.failed ?? []
    }))
    .filter((item) => item.achados.length > 0);

  if (!rejected.length) {
    return "";
  }

  return `## Correcoes solicitadas pelas revisoes

Corrija os pontos abaixo antes de continuar. Mantenha a implementacao original e ajuste apenas o necessario.

\`\`\`json
${JSON.stringify(rejected, null, 2)}
\`\`\`
`;
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
    const secretScanContent = file.endsWith(".env.example")
      ? content.replace(/^[A-Z0-9_]*(PASSWORD|SECRET|TOKEN|KEY)=.*$/gmi, "")
      : content;
    if (/(ghp_|github_pat_|glpat-|PRIVATE KEY|BEGIN RSA|JWT_SECRET=|PASSWORD=)/i.test(secretScanContent)) {
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
  transition(root, execution, STATES.WAITING_FOR_PRODUCT_REVIEW, "Regras de negocio aprovadas");
}

function productAgent(root, execution) {
  execution.currentAgent = "PRODUCT";
  transition(root, execution, STATES.PRODUCT_REVIEW, "Revisando produto");
  const files = reviewFiles(root, execution);
  const relevantFiles = files.filter((file) => isProductRelevantFile(normalizePath(file)));
  const findings = [];
  const context = {
    originalRequest: execution.originalRequest,
    allChangedFiles: files.map(normalizePath),
    poOutput: execution.poOutput
  };

  for (const file of relevantFiles) {
    const normalized = normalizePath(file);
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    const content = readFileSync(absolute, "utf8");
    findings.push(...productFindingsForFile(normalized, content, context));
  }

  findings.push(...productFindingsForChangeSet(files, context));

  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.productOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: relevantFiles,
    findings,
    productChecklist: productChecklistForFiles(files, execution.originalRequest),
    approvedForUx: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.productFixAttempts = (execution.productFixAttempts ?? 0) + 1;
    if (execution.productFixAttempts > MAX_PRODUCT_FIXES) {
      throw new Error("Limite de correcoes de produto excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Produto reprovado; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_UX_REVIEW, "Produto aprovado");
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
  transition(root, execution, STATES.WAITING_FOR_ACCESSIBILITY_REVIEW, "UX aprovada");
}

function accessibilityAgent(root, execution) {
  execution.currentAgent = "ACCESSIBILITY";
  transition(root, execution, STATES.ACCESSIBILITY_REVIEW, "Revisando acessibilidade");
  const files = reviewFiles(root, execution);
  const frontendFiles = files.filter((file) => normalizePath(file).startsWith("nexusos-web/src/"));
  const findings = [];

  for (const file of frontendFiles) {
    const normalized = normalizePath(file);
    const absolute = join(root, file);
    if (!existsSync(absolute) || !/\.(tsx|jsx)$/.test(normalized)) continue;
    const content = readFileSync(absolute, "utf8");
    findings.push(...accessibilityFindingsForFile(normalized, content));
  }

  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.accessibilityOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: frontendFiles,
    findings,
    approvedForTesting: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.accessibilityFixAttempts = (execution.accessibilityFixAttempts ?? 0) + 1;
    if (execution.accessibilityFixAttempts > MAX_ACCESSIBILITY_FIXES) {
      throw new Error("Limite de correcoes de acessibilidade excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Acessibilidade reprovada; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_PERFORMANCE_REVIEW, "Acessibilidade aprovada");
}

function performanceAgent(root, execution) {
  execution.currentAgent = "PERFORMANCE";
  transition(root, execution, STATES.PERFORMANCE_REVIEW, "Revisando performance");
  const files = reviewFiles(root, execution);
  const relevantFiles = files.filter((file) => isPerformanceRelevantFile(normalizePath(file)));
  const findings = [];

  for (const file of relevantFiles) {
    const normalized = normalizePath(file);
    const absolute = join(root, file);
    if (!existsSync(absolute)) continue;
    const content = readFileSync(absolute, "utf8");
    findings.push(...performanceFindingsForFile(normalized, content));
  }

  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.performanceOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: relevantFiles,
    findings,
    approvedForTesting: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.performanceFixAttempts = (execution.performanceFixAttempts ?? 0) + 1;
    if (execution.performanceFixAttempts > MAX_PERFORMANCE_FIXES) {
      throw new Error("Limite de correcoes de performance excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Performance reprovada; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_TESTS, "Performance aprovada");
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
  transition(root, execution, STATES.WAITING_FOR_MANUAL_QA_REVIEW, "Deploy/producao aprovado");
}

function manualQaAgent(root, execution) {
  execution.currentAgent = "MANUAL_QA";
  transition(root, execution, STATES.MANUAL_QA_REVIEW, "Preparando QA manual");
  const files = reviewFiles(root, execution);
  const plan = manualQaPlanForFiles(execution.originalRequest, files, execution.poOutput);
  execution.manualQaOutput = {
    status: "prepared",
    reviewedFiles: files,
    checklist: plan.checklist,
    smokeTests: plan.smokeTests,
    regressionAreas: plan.regressionAreas,
    devices: plan.devices,
    dataSetup: plan.dataSetup,
    notes: plan.notes,
    approvedForDelivery: true
  };
  saveExecution(root, execution);
  transition(root, execution, STATES.WAITING_FOR_DOCUMENTATION_REVIEW, "QA manual preparado");
}

function documentationAgent(root, execution) {
  execution.currentAgent = "DOCUMENTATION";
  transition(root, execution, STATES.DOCUMENTATION_REVIEW, "Revisando documentacao");
  const files = reviewFiles(root, execution);
  const findings = documentationFindingsForFiles(files, {
    originalRequest: execution.originalRequest,
    poOutput: execution.poOutput,
    changedFileContents: readChangedFiles(root, files)
  });
  const rejected = findings.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH");
  execution.documentationOutput = {
    status: rejected ? "rejected" : "approved",
    reviewedFiles: files,
    findings,
    checklist: documentationChecklistForFiles(files, execution.originalRequest),
    approvedForDelivery: !rejected
  };
  saveExecution(root, execution);
  if (rejected) {
    execution.documentationFixAttempts = (execution.documentationFixAttempts ?? 0) + 1;
    if (execution.documentationFixAttempts > MAX_DOCUMENTATION_FIXES) {
      throw new Error("Limite de correcoes de documentacao excedido.");
    }
    transition(root, execution, STATES.WAITING_FOR_DEVELOPMENT, "Documentacao reprovada; voltando ao desenvolvimento");
    return;
  }
  transition(root, execution, STATES.WAITING_FOR_DELIVERY, "Documentacao aprovada");
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
  const isLocalDefaultConfig = isEnvExample || file.endsWith("src/main/resources/application.yaml");

  if (/(PASSWORD|TOKEN|SECRET|PRIVATE_KEY|ACCESS_TOKEN)=([^\s#]+)$/gim.test(content) && !isEnvExample) {
    findings.push(deploymentFinding(
      "CRITICAL",
      "Possivel segredo em arquivo versionavel",
      file,
      "Valores sensiveis devem ficar apenas em variaveis de ambiente reais, nunca em arquivos versionados."
    ));
  }

  if (!isLocalDefaultConfig && /(localhost|127\.0\.0\.1|host\.docker\.internal)/i.test(content) && /(NEXT_PUBLIC|API_PUBLIC_URL|FRONTEND_BASE_URL|CORS_ALLOWED_ORIGINS|DATABASE_JDBC_URL)/i.test(content)) {
    findings.push(deploymentFinding(
      "HIGH",
      "URL publica apontando para ambiente local",
      file,
      "Variaveis publicas de producao devem usar o dominio final HTTPS, nao localhost ou IP local."
    ));
  }

  if (!isLocalDefaultConfig && (/\bNEXT_PUBLIC_API_URL\s*[:=]\s*http:\/\//i.test(content) || /\bAPI_PUBLIC_URL\s*[:=]\s*http:\/\//i.test(content))) {
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

export function accessibilityFindingsForFile(file, content) {
  const findings = [];
  const buttonMatches = content.match(/<Button\b[^>]*>([\s\S]*?)<\/Button>|<button\b[^>]*>([\s\S]*?)<\/button>/gi) ?? [];
  for (const match of buttonMatches) {
    if (!hasAccessibleName(match)) {
      findings.push(accessibilityFinding(
        "HIGH",
        "Botao sem nome acessivel",
        file,
        "Botoes com apenas icone ou conteudo dinamico precisam de texto visivel, aria-label ou sr-only."
      ));
      break;
    }
  }

  const inputMatches = content.match(/<(Input|input|Textarea|textarea|SelectTrigger)\b[^>]*>/gi) ?? [];
  for (const match of inputMatches) {
    if (!/aria-label=|aria-labelledby=|id=|name=|placeholder=/i.test(match) && !/<Label\b|htmlFor=/i.test(content)) {
      findings.push(accessibilityFinding(
        "HIGH",
        "Campo sem rotulo acessivel",
        file,
        "Campos de formulario precisam de Label associado, aria-label ou aria-labelledby."
      ));
      break;
    }
  }

  const imageMatches = content.match(/<(img|Image)\b[^>]*>/gi) ?? [];
  for (const match of imageMatches) {
    if (!/\balt=/.test(match)) {
      findings.push(accessibilityFinding(
        "HIGH",
        "Imagem sem texto alternativo",
        file,
        "Imagens informativas precisam de alt; imagens decorativas devem usar alt vazio explicitamente."
      ));
      break;
    }
  }

  if (/<div\b[^>]*onClick=|<span\b[^>]*onClick=/i.test(content) && !/(role=|tabIndex=|onKeyDown=|onKeyUp=|onKeyPress=)/i.test(content)) {
    findings.push(accessibilityFinding(
      "HIGH",
      "Elemento clicavel sem suporte a teclado",
      file,
      "Use button/link nativo ou adicione role, tabIndex e handlers de teclado."
    ));
  }

  if (/outline-none|focus:outline-none/.test(content) && !/(focus-visible:|focus:ring|focus:border|focus-visible:ring)/.test(content)) {
    findings.push(accessibilityFinding(
      "MEDIUM",
      "Indicador de foco pode estar removido",
      file,
      "Ao remover outline, forneca estilo de foco visivel para teclado."
    ));
  }

  if (/text-(gray|slate|zinc|neutral)-4\d\d/.test(content) && /bg-(white|gray-50|slate-50|zinc-50|neutral-50)/.test(content)) {
    findings.push(accessibilityFinding(
      "MEDIUM",
      "Possivel contraste baixo",
      file,
      "Revise contraste de textos claros sobre fundo claro, principalmente em informacoes importantes."
    ));
  }

  if (/<Dialog|<AlertDialog/.test(content) && !/(DialogTitle|AlertDialogTitle|aria-describedby|DialogDescription|AlertDialogDescription)/.test(content)) {
    findings.push(accessibilityFinding(
      "MEDIUM",
      "Dialog sem titulo ou descricao acessivel evidente",
      file,
      "Modais precisam de titulo/descricao conectados para leitores de tela."
    ));
  }

  if (/<table|<Table/.test(content) && !/(<caption|aria-label=|aria-labelledby=|TableCaption)/i.test(content)) {
    findings.push(accessibilityFinding(
      "LOW",
      "Tabela sem contexto acessivel",
      file,
      "Tabelas devem ter caption, aria-label ou titulo conectado para explicar os dados."
    ));
  }

  return findings;
}

function hasAccessibleName(markup) {
  if (/aria-label=|aria-labelledby=|title=/.test(markup)) return true;
  if (/<span\b[^>]*className=["'][^"']*sr-only/i.test(markup)) return true;
  const withoutTags = markup.replace(/<[^>]+>/g, "").replace(/[{}\s]/g, "");
  return /[A-Za-z0-9]/.test(withoutTags);
}

function accessibilityFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "ACCESSIBILITY"
  };
}

function isPerformanceRelevantFile(file) {
  return (
    file.startsWith("src/main/java/") && file.endsWith(".java")
  ) || (
    file.startsWith("nexusos-web/src/") && /\.(ts|tsx|jsx)$/.test(file)
  ) || (
    file === "nexusos-web/next.config.ts" ||
    file === "nexusos-web/next.config.js" ||
    file === "pom.xml" ||
    file === "nexusos-web/package.json"
  );
}

export function performanceFindingsForFile(file, content) {
  const findings = [];
  const isJava = file.endsWith(".java");
  const isFrontend = /\.(ts|tsx|jsx)$/.test(file);

  if (isJava && /findAll\s*\(/.test(content) && !/(Pageable|Page<|Slice<|Limit|setMaxResults|Top\d+|First\d+)/.test(content)) {
    findings.push(performanceFinding(
      "HIGH",
      "Consulta sem paginacao aparente",
      file,
      "Listagens e rotinas operacionais devem usar Pageable, limit ou filtros para evitar carregar toda a tabela."
    ));
  }

  if (isJava && /for\s*\([^)]*\)\s*\{[\s\S]{0,500}\.(findBy|findAll|save|delete)/.test(content)) {
    findings.push(performanceFinding(
      "HIGH",
      "Acesso ao banco dentro de loop",
      file,
      "Evite N+1 e escritas item a item; prefira query em lote, join fetch, projection ou operacao bulk."
    ));
  }

  if (isJava && /@OneToMany|@ManyToMany/.test(content) && !/FetchType\.LAZY/.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Relacionamento plural sem lazy explicito",
      file,
      "Colecoes JPA devem ser lazy por padrao e carregadas com projection/fetch planejado quando necessario."
    ));
  }

  if (isJava && /@Transactional\b/.test(content) && /RestTemplate|WebClient|MercadoPago|send|Email|WhatsApp/i.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Transacao envolvendo chamada externa",
      file,
      "Evite manter transacao de banco aberta durante chamadas externas; separe persistencia e integracoes."
    ));
  }

  if (isJava && /@Query\s*\(/.test(content) && !/(countQuery|Page<|Pageable|LIMIT|limit)/.test(content) && /(JOIN|LEFT JOIN|GROUP BY|ORDER BY)/i.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Query complexa sem paginacao/count planejado",
      file,
      "Queries com joins, ordenacao ou agrupamento devem ter paginacao e indices revisados."
    ));
  }

  if (isFrontend && /useEffect\s*\([\s\S]{0,600}(fetch\(|api\.|axios\.|service\.)/.test(content) && !/useQuery|queryKey|AbortController|cancelToken/.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Busca de dados sem cache/cancelamento evidente",
      file,
      "Prefira React Query ou AbortController para cache, deduplicacao e cancelamento ao trocar de tela."
    ));
  }

  if (isFrontend && /\.(map)\s*\(/.test(content) && /(ordens|items|dados|rows|notificacoes|clientes|usuarios|projetos)\.map/i.test(content) && !/(slice\(|virtual|Virtuoso|FixedSizeList|pagination|paginacao|pageSize)/i.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Lista potencialmente grande sem paginacao ou virtualizacao",
      file,
      "Listas de OS, clientes, usuarios e notificacoes devem ter paginacao, limite ou virtualizacao."
    ));
  }

  if (isFrontend && /<Image\b/.test(content) && !/(sizes=|priority=|placeholder=)/.test(content)) {
    findings.push(performanceFinding(
      "LOW",
      "Imagem Next sem hint de carregamento",
      file,
      "Imagens importantes devem declarar sizes/priority/placeholder conforme o caso para melhorar LCP e evitar layout shift."
    ));
  }

  if (isFrontend && /<img\b/i.test(content) && !/loading=/.test(content)) {
    findings.push(performanceFinding(
      "LOW",
      "Imagem HTML sem lazy loading",
      file,
      "Use loading=\"lazy\" em imagens nao criticas ou troque para next/image quando fizer sentido."
    ));
  }

  if (isFrontend && /setInterval|setTimeout/.test(content) && !/clearInterval|clearTimeout/.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Timer sem limpeza evidente",
      file,
      "Timers em componentes precisam de cleanup para evitar trabalho em background e vazamento de memoria."
    ));
  }

  if (isFrontend && /router\.refresh\(\)|window\.location\.reload\(\)/.test(content)) {
    findings.push(performanceFinding(
      "LOW",
      "Recarregamento amplo da tela",
      file,
      "Prefira invalidar queries ou atualizar estado local em vez de recarregar tudo quando possivel."
    ));
  }

  if ((file.endsWith("next.config.ts") || file.endsWith("next.config.js")) && /unoptimized:\s*true/.test(content)) {
    findings.push(performanceFinding(
      "MEDIUM",
      "Otimizacao de imagens desativada",
      file,
      "Revise se next/image precisa ficar unoptimized; isso pode piorar carregamento em producao."
    ));
  }

  return findings;
}

function performanceFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "PERFORMANCE"
  };
}

function isProductRelevantFile(file) {
  return (
    file.startsWith("nexusos-web/src/") && /\.(ts|tsx|jsx)$/.test(file) && /(app|components|services|hooks|contexts)/i.test(file)
  ) || (
    file.startsWith("src/main/java/") && file.endsWith(".java") && /(controller|service|dto|ordemservico|cliente|dashboard|notificacao|pagamento|usuario|portal)/i.test(file)
  );
}

export function productFindingsForFile(file, content, context = {}) {
  const findings = [];
  const isFrontend = /\.(ts|tsx|jsx)$/.test(file);
  const isBackend = file.endsWith(".java");
  const lowerFile = file.toLowerCase();

  if (isFrontend && /export default function|function\s+[A-Z]\w*\s*\(|const\s+[A-Z]\w*\s*=/.test(content) && /(fetch|useQuery|api\.|service\.|axios)/i.test(content)) {
    if (!/(loading|isLoading|pending|skeleton|carregando)/i.test(content)) {
      findings.push(productFinding(
        "MEDIUM",
        "Tela com dados sem estado de carregamento evidente",
        file,
        "Fluxos com dados remotos precisam deixar claro que a informacao esta carregando."
      ));
    }
    if (!/(error|isError|erro|falha|tentar novamente|retry)/i.test(content)) {
      findings.push(productFinding(
        "MEDIUM",
        "Tela com dados sem estado de erro evidente",
        file,
        "Quando a API falhar, o usuario precisa entender o problema e ter uma acao de recuperacao."
      ));
    }
  }

  if (isFrontend && /\.(map)\s*\(/.test(content) && !/(empty|vazio|nenhum|sem resultado|sem dados|length === 0|\.length \?)/i.test(content)) {
    findings.push(productFinding(
      "MEDIUM",
      "Listagem sem estado vazio evidente",
      file,
      "Listas devem explicar quando nao ha resultados e oferecer proximo passo quando fizer sentido."
    ));
  }

  if (isFrontend && /(onClick|onSubmit|mutate|handle[A-Z]\w*)/i.test(content) && /(aprovar|reprovar|salvar|cancelar|finalizar|excluir|criar|atualizar)/i.test(content) && !/(toast|sonner|setSuccess|sucesso|erro|isSubmitting|disabled|loading)/i.test(content)) {
    findings.push(productFinding(
      "HIGH",
      "Acao principal sem feedback de resultado",
      file,
      "Acoes importantes precisam comunicar sucesso, falha e estado de processamento."
    ));
  }

  if (isFrontend && /dashboard/i.test(lowerFile) && /(Card|Metric|indicador|vencidas|vence hoje|status)/i.test(content) && !/(href=|router\.push|Link|onClick|filter|filtro)/i.test(content)) {
    findings.push(productFinding(
      "HIGH",
      "Indicador do dashboard sem caminho de acao",
      file,
      "Indicadores operacionais devem levar para a lista filtrada ou proximo passo acionavel."
    ));
  }

  if (isFrontend && /portal/i.test(lowerFile) && /(status|prioridade|sequencia|responsavel|workflow)/i.test(content) && !/(proximo passo|acompanhar|aprovar|solicitar ajuste|pagar|decidir|entrega)/i.test(content)) {
    findings.push(productFinding(
      "MEDIUM",
      "Portal pode estar orientado a termos internos",
      file,
      "Portal do cliente deve priorizar decisao: o que foi feito, o que falta, aprovar, ajustar ou pagar."
    ));
  }

  if (isFrontend && /(Dialog|Modal|Sheet)/.test(content) && /(criar|editar|finalizar|analise|pagamento|cancelar|reabrir)/i.test(content) && content.length > 26000 && !/(\/new|\/editar|page\.tsx|router\.push)/i.test(content)) {
    findings.push(productFinding(
      "MEDIUM",
      "Fluxo complexo pode estar escondido em modal",
      file,
      "Rotinas longas ou criticas tendem a funcionar melhor como tela dedicada, principalmente no mobile."
    ));
  }

  if (isBackend && /@(PostMapping|PutMapping|PatchMapping|DeleteMapping)/.test(content) && /(ResponseEntity|void|Dto|DTO)/.test(content) && !/(Notificacao|Auditoria|Historico|Created|NoContent|BadRequest|mensagem|message)/i.test(content)) {
    findings.push(productFinding(
      "LOW",
      "Endpoint mutavel sem sinal claro de retorno operacional",
      file,
      "Acoes de produto devem retornar estado suficiente para atualizar a interface sem recarregar tudo."
    ));
  }

  if (isBackend && /(dashboard|relatorio|metric|indicador)/i.test(lowerFile + content) && !/(filtro|periodo|status|cliente|responsavel|dataInicio|dataFim)/i.test(content)) {
    findings.push(productFinding(
      "MEDIUM",
      "Indicador sem recorte operacional evidente",
      file,
      "Metricas de produto devem permitir recorte por periodo/status/cliente/responsavel quando forem usadas para decisao."
    ));
  }

  return findings;
}

export function productFindingsForChangeSet(files, context = {}) {
  const normalizedFiles = files.map(normalizePath);
  const findings = [];
  const backendProductChanged = normalizedFiles.some((file) => file.startsWith("src/main/java/") && /(controller|service|dto|ordemservico|cliente|dashboard|notificacao|pagamento|usuario|portal)/i.test(file));
  const frontendChanged = normalizedFiles.some((file) => file.startsWith("nexusos-web/src/"));
  const frontendServiceOnly = normalizedFiles.some((file) => file.startsWith("nexusos-web/src/services/")) && !normalizedFiles.some((file) => file.startsWith("nexusos-web/src/app/") || file.startsWith("nexusos-web/src/components/"));

  if (backendProductChanged && !frontendChanged && /(tela|botao|portal|dashboard|listagem|cliente|usuario|fluxo|status|aprov|pagamento)/i.test(context.originalRequest ?? "")) {
    findings.push(productFinding(
      "MEDIUM",
      "Mudanca de produto sem superficie frontend alterada",
      "nexusos-web/src",
      "Se a regra muda uma rotina do usuario, confirme se a tela, textos, filtros ou acoes tambem precisam refletir isso."
    ));
  }

  if (frontendServiceOnly) {
    findings.push(productFinding(
      "LOW",
      "Servico frontend alterado sem tela consumidora",
      "nexusos-web/src/services",
      "Confirme se a mudanca no contrato ja esta refletida em telas, estados e mensagens."
    ));
  }

  return findings;
}

function productChecklistForFiles(files, originalRequest) {
  const normalizedFiles = files.map(normalizePath);
  const checklist = [
    `Confirmar qual problema do usuario o pedido resolve: ${originalRequest}`,
    "Validar caminho principal, estado vazio, erro, loading e feedback de sucesso/falha.",
    "Confirmar se a mudanca aumenta ou reduz passos na rotina principal."
  ];

  if (normalizedFiles.some((file) => /dashboard/i.test(file))) {
    checklist.push("Conferir se indicadores sao acionaveis e levam para listas filtradas.");
  }
  if (normalizedFiles.some((file) => /portal|cliente/i.test(file))) {
    checklist.push("Conferir se o cliente entende proximo passo, aprovacao, ajuste e pagamento sem termos internos.");
  }
  if (normalizedFiles.some((file) => /ordens-servico|ordemservico/i.test(file))) {
    checklist.push("Conferir se o fluxo de OS continua claro para admin e desenvolvedor.");
  }
  if (normalizedFiles.some((file) => /notificacao/i.test(file))) {
    checklist.push("Conferir se notificacoes chegam para quem precisa agir e com link util.");
  }

  return checklist;
}

function productFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "PRODUCT"
  };
}

function readChangedFiles(root, files) {
  return Object.fromEntries(files.map((file) => {
    const absolute = join(root, file);
    return [normalizePath(file), existsSync(absolute) ? readFileSync(absolute, "utf8") : ""];
  }));
}

export function documentationFindingsForFiles(files, context = {}) {
  const normalizedFiles = files.map(normalizePath);
  const docsChanged = normalizedFiles.some(isDocumentationFile);
  const envExampleChanged = normalizedFiles.some((file) => file.endsWith(".env.example"));
  const agentDocsChanged = normalizedFiles.some((file) => file.startsWith("docs/agents/"));
  const findings = [];
  const changedContents = context.changedFileContents ?? {};
  const nonDocFiles = normalizedFiles.filter((file) => !isDocumentationFile(file));

  if (normalizedFiles.some((file) => file.startsWith("tools/agents/")) && !agentDocsChanged) {
    findings.push(documentationFinding(
      "HIGH",
      "Sistema de agentes alterado sem documentacao",
      "docs/agents",
      "Mudancas no fluxo dos agentes devem atualizar AGENTS, WORKFLOW, ARCHITECTURE ou USAGE."
    ));
  }

  if (normalizedFiles.some((file) => /Controller\.java$|Dto\.java$|DTO\.java$/.test(file)) && !docsChanged) {
    findings.push(documentationFinding(
      "MEDIUM",
      "Contrato de API possivelmente alterado sem documentacao",
      "docs",
      "Quando controllers ou DTOs mudam, revise docs de API, exemplos de payload e criterios de integracao."
    ));
  }

  if (normalizedFiles.some((file) => /docker-compose|Dockerfile|nginx|application(?:-[\w-]+)?\.(ya?ml|properties)$/.test(file)) && !docsChanged) {
    findings.push(documentationFinding(
      "MEDIUM",
      "Configuracao operacional alterada sem guia atualizado",
      "docs",
      "Mudancas de deploy, Docker, Nginx ou application config devem atualizar instrucoes operacionais."
    ));
  }

  if (normalizedFiles.some((file) => file.startsWith("nexusos-web/src/") || file.startsWith("src/main/java/")) && !docsChanged) {
    findings.push(documentationFinding(
      "LOW",
      "Mudanca de produto sem nota de documentacao",
      "docs",
      "Avalie atualizar guia de uso, changelog ou descricao operacional quando o comportamento do usuario mudar."
    ));
  }

  for (const file of nonDocFiles) {
    const content = changedContents[file] ?? "";
    const envVars = extractEnvVariables(content);
    if (envVars.length > 0 && !envExampleChanged) {
      findings.push(documentationFinding(
        "HIGH",
        "Variavel de ambiente sem exemplo versionado",
        file,
        `Inclua ${envVars.slice(0, 5).join(", ")} em .env.example ou documente o motivo de nao expor exemplo.`
      ));
      break;
    }
  }

  if (/relatorio|export|pdf|excel|pagamento|mercado pago|email|whatsapp|deploy|dominio|cloudflare/i.test(context.originalRequest ?? "") && !docsChanged) {
    findings.push(documentationFinding(
      "MEDIUM",
      "Funcionalidade operacional sem instrucoes de uso",
      "docs",
      "Recursos operacionais ou integracoes precisam de passos de configuracao, uso e troubleshooting."
    ));
  }

  return findings;
}

function documentationChecklistForFiles(files, originalRequest) {
  const normalizedFiles = files.map(normalizePath);
  const checklist = [
    `Confirmar se o pedido "${originalRequest}" precisa de nota de uso ou troubleshooting.`,
    "Revisar se exemplos de ambiente continuam completos.",
    "Revisar se novos fluxos aparecem em guias operacionais ou criterios de QA."
  ];

  if (normalizedFiles.some((file) => file.startsWith("tools/agents/"))) {
    checklist.push("Atualizar docs/agents/AGENTS.md, WORKFLOW.md, ARCHITECTURE.md e USAGE.md quando o pipeline mudar.");
  }
  if (normalizedFiles.some((file) => /Controller\.java$|Dto\.java$|DTO\.java$/.test(file))) {
    checklist.push("Atualizar exemplos de request/response e permissao dos endpoints alterados.");
  }
  if (normalizedFiles.some((file) => /docker-compose|Dockerfile|nginx|application(?:-[\w-]+)?\.(ya?ml|properties)$/.test(file))) {
    checklist.push("Atualizar passos de deploy, variaveis, portas, proxy e rollback.");
  }
  if (normalizedFiles.some((file) => file.endsWith("db/migration") || file.includes("db/migration/"))) {
    checklist.push("Documentar impacto de migration, backup e validacao pos-deploy.");
  }
  if (normalizedFiles.some((file) => file.startsWith("nexusos-web/src/"))) {
    checklist.push("Atualizar textos de ajuda, roteiro de QA ou guia do usuario quando a tela mudar.");
  }

  return checklist;
}

function isDocumentationFile(file) {
  return (
    file.toLowerCase().endsWith(".md") ||
    file.startsWith("docs/") ||
    file.includes("/docs/") ||
    file.endsWith(".env.example")
  );
}

function extractEnvVariables(content) {
  const vars = new Set();
  for (const match of content.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    vars.add(match[1]);
  }
  for (const match of content.matchAll(/\$\{([A-Z][A-Z0-9_]*)(?::[^}]*)?\}/g)) {
    vars.add(match[1]);
  }
  for (const match of content.matchAll(/@Value\s*\(\s*"\$\{([A-Z][A-Z0-9_]*)(?::[^}]*)?\}"/g)) {
    vars.add(match[1]);
  }
  return [...vars];
}

function documentationFinding(severity, title, file, recommendation) {
  return {
    severity,
    title,
    file,
    recommendation,
    category: "DOCUMENTATION"
  };
}

export function manualQaPlanForFiles(request, files, poOutput = {}) {
  const normalizedFiles = files.map(normalizePath);
  const checklist = [
    qaStep("Fluxo principal", `Executar o pedido original: ${request}`, "Confirmar que o fluxo termina sem erro visual, erro de API ou estado inconsistente."),
    qaStep("Permissoes", "Validar o comportamento com usuario ADMIN e DESENVOLVEDOR quando a tela/API for autenticada.", "Confirmar que cada perfil ve somente as acoes permitidas."),
    qaStep("Regressao basica", "Abrir dashboard, listagem de OS, detalhe de OS e notificacoes.", "Confirmar que dados carregam e navegacao continua funcionando.")
  ];
  const smokeTests = [
    "Login com usuario valido.",
    "Recarregar a pagina depois do login.",
    "Abrir a tela alterada diretamente pela URL.",
    "Testar erro de API/rede quando houver acao de salvar."
  ];
  const regressionAreas = new Set(["Autenticacao", "Navegacao principal"]);
  const devices = new Set(["Desktop 1366px", "Mobile 390px"]);
  const dataSetup = ["Usar pelo menos uma OS existente com cliente, responsavel e status ativo."];
  const notes = [];

  if (normalizedFiles.some((file) => file.startsWith("src/main/"))) {
    checklist.push(qaStep("API", "Executar o endpoint alterado com dados validos e invalidos.", "Confirmar status HTTP, mensagem de erro e persistencia correta."));
    checklist.push(qaStep("Performance da API", "Executar listagens/filtros com volume maior de dados.", "Confirmar paginacao, tempo de resposta aceitavel e ausencia de erro nos logs."));
    regressionAreas.add("API REST");
    regressionAreas.add("Performance backend");
  }

  if (normalizedFiles.some((file) => file.startsWith("nexusos-web/src/"))) {
    checklist.push(qaStep("Frontend", "Validar carregamento, estado vazio, erro, loading e acao principal da tela alterada.", "Confirmar que o usuario entende o proximo passo."));
    checklist.push(qaStep("Responsividade", "Testar a tela alterada em desktop e mobile.", "Confirmar que nao ha texto cortado, botao fora da tela ou rolagem horizontal inesperada."));
    checklist.push(qaStep("Acessibilidade", "Navegar pela tela alterada usando Tab/Shift+Tab e leitor de tela quando possivel.", "Confirmar foco visivel, ordem logica, botoes nomeados e campos com rotulo."));
    checklist.push(qaStep("Performance visual", "Abrir a tela com muitos registros e repetir filtros/navegacao.", "Confirmar que a interface nao trava, nao pisca em excesso e mantem resposta rapida."));
    regressionAreas.add("Interface web");
    regressionAreas.add("Acessibilidade");
    regressionAreas.add("Performance frontend");
    devices.add("Tablet 768px");
  }

  if (normalizedFiles.some((file) => /ordens-servico|ordemservico/i.test(file))) {
    checklist.push(qaStep("Ordem de servico", "Criar/abrir uma OS e validar status, prioridade, responsavel, textos, valores e auditoria quando aplicavel.", "Confirmar que a OS fica no status esperado e com historico coerente."));
    checklist.push(qaStep("Workflow da OS", "Avancar a OS pelo fluxo permitido e tentar uma acao nao permitida.", "Confirmar que transicoes invalidas sao bloqueadas com mensagem clara."));
    regressionAreas.add("Fluxo de OS");
    dataSetup.push("Ter OS em status RECEBIDA, EM_ANALISE, AGUARDANDO_APROVACAO, EM_DESENVOLVIMENTO e FINALIZADA.");
  }

  if (normalizedFiles.some((file) => /portal|cliente/i.test(file))) {
    checklist.push(qaStep("Portal do cliente", "Abrir o link publico do cliente, acompanhar OS, aprovar e reprovar com motivo.", "Confirmar linguagem clara e ausencia de campos internos desnecessarios."));
    regressionAreas.add("Portal do Cliente");
    dataSetup.push("Usar uma OS com token publico ativo e uma OS aguardando aprovacao do cliente.");
  }

  if (normalizedFiles.some((file) => /dashboard/i.test(file))) {
    checklist.push(qaStep("Dashboard", "Validar cards, graficos, filtros e navegacao clicavel para listagens filtradas.", "Confirmar que os numeros batem com a listagem filtrada."));
    regressionAreas.add("Dashboard e indicadores");
  }

  if (normalizedFiles.some((file) => /notificacao|notificacoes/i.test(file))) {
    checklist.push(qaStep("Notificacoes", "Executar o evento alterado e conferir notificacao para admin/desenvolvedor.", "Confirmar destinatario, texto, link e leitura da notificacao."));
    regressionAreas.add("Notificacoes");
  }

  if (normalizedFiles.some((file) => /auth|security|cookie|jwt/i.test(file))) {
    checklist.push(qaStep("Sessao e seguranca", "Validar login, refresh, logout e tentativa de acesso sem permissao.", "Confirmar cookies/tokens, expiracao e redirecionamento correto."));
    regressionAreas.add("Autenticacao e autorizacao");
  }

  if (normalizedFiles.some((file) => /db\/migration|entity|repository/i.test(file))) {
    checklist.push(qaStep("Dados", "Aplicar migration em banco limpo e em banco com dados existentes.", "Confirmar que dados antigos permanecem acessiveis e consistentes."));
    regressionAreas.add("Banco de dados");
    dataSetup.push("Manter um backup ou dump pequeno para comparar dados antes/depois.");
  }

  if (normalizedFiles.some((file) => isDeploymentRelevantFile(file))) {
    checklist.push(qaStep("Deploy", "Subir containers localmente ou em ambiente de homologacao com variaveis de producao simuladas.", "Confirmar healthcheck, portas, URLs publicas, CORS e logs sem erro."));
    regressionAreas.add("Deploy/Producao");
  }

  const acceptanceCriteria = poOutput?.acceptanceCriteria ?? [];
  for (const criterion of acceptanceCriteria) {
    checklist.push(qaStep("Criterio de aceitacao", criterion, "Marcar como aprovado somente com evidencia visual ou funcional."));
  }

  if (normalizedFiles.length === 0) {
    notes.push("Nenhum arquivo alterado detectado; checklist gerado apenas pelo pedido original.");
  }

  return {
    checklist,
    smokeTests,
    regressionAreas: [...regressionAreas],
    devices: [...devices],
    dataSetup,
    notes
  };
}

function qaStep(area, action, expected) {
  return { area, action, expected };
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

## Produto

Resultado: ${execution.productOutput?.status ?? "nao executado"}

${(execution.productOutput?.productChecklist ?? []).map((item) => `- ${item}`).join("\n") || "- Checklist nao gerado."}

## Acessibilidade

Resultado: ${execution.accessibilityOutput?.status ?? "nao executado"}

## Performance

Resultado: ${execution.performanceOutput?.status ?? "nao executado"}

## Deploy e producao

Resultado: ${execution.deploymentOutput?.status ?? "nao executado"}

## QA manual

Resultado: ${execution.manualQaOutput?.status ?? "nao executado"}

${(execution.manualQaOutput?.checklist ?? []).map((item, index) => `${index + 1}. ${item.area}: ${item.action} Esperado: ${item.expected}`).join("\n") || "- Checklist nao gerado."}

## Documentacao

Resultado: ${execution.documentationOutput?.status ?? "nao executado"}

${(execution.documentationOutput?.checklist ?? []).map((item) => `- ${item}`).join("\n") || "- Checklist nao gerado."}

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
- [x] Produto revisado
- [x] Acessibilidade revisada
- [x] Performance revisada
- [x] Verificacao de tipos/testes/build executados conforme configuracao local
- [x] Deploy/producao revisado
- [x] QA manual preparado
- [x] Documentacao revisada
- [x] Documentacao atualizada
- [x] Commit criado
- [x] Push realizado
`;
}
