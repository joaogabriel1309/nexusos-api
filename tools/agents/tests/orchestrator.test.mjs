import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newExecution } from "../core.mjs";
import { accessibilityFindingsForFile, businessRuleFindingsForFile, databaseFindingsForFile, deploymentFindingsForFile, developerAutomationDiagnostics, documentationFindingsForFiles, manualQaPlanForFiles, performanceFindingsForFile, productFindingsForChangeSet, productFindingsForFile, renderDeveloperCommand, resolveDeveloperCommand, writeDeveloperPrompt } from "../orchestrator.mjs";

function fakeExecution(root) {
  const execution = newExecution(root, "Criar tela de teste");
  execution.branch = "feat/tela-teste";
  execution.targetBranch = "master";
  execution.poOutput = {
    title: "Criar tela de teste",
    requirements: ["Implementar tela"],
    acceptanceCriteria: ["Build aprovado"]
  };
  execution.projectAnalysis = {
    frontend: "Next.js",
    backend: "Spring Boot"
  };
  return execution;
}

test("gera prompt tecnico para o braco programador", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-orchestrator-"));
  try {
    const execution = fakeExecution(root);
    const promptFile = writeDeveloperPrompt(root, execution);
    assert.equal(existsSync(promptFile), true);
    const content = readFileSync(promptFile, "utf8");
    assert.match(content, /Agente Desenvolvedor/);
    assert.match(content, /Criar tela de teste/);
    assert.match(content, /Nao faca commit, push, merge ou Pull Request/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renderiza comando com placeholders de contexto", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-orchestrator-"));
  try {
    const execution = fakeExecution(root);
    const promptFile = writeDeveloperPrompt(root, execution);
    const command = renderDeveloperCommand("codex exec --full-auto {promptFile}", root, execution, promptFile);
    assert.match(command, /codex exec --full-auto/);
    assert.match(command, /developer-prompt\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("usa runner local para provider codex", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-orchestrator-"));
  const previousProvider = process.env.AGENTS_DEVELOPER_PROVIDER;
  const previousCommand = process.env.AGENTS_DEVELOPER_COMMAND;
  try {
    delete process.env.AGENTS_DEVELOPER_COMMAND;
    process.env.AGENTS_DEVELOPER_PROVIDER = "codex";
    const execution = fakeExecution(root);
    const promptFile = writeDeveloperPrompt(root, execution);
    const command = resolveDeveloperCommand(root, execution, promptFile);
    assert.match(command, /codex-developer-runner\.mjs/);
    assert.match(command, /developer-prompt\.md/);
    assert.doesNotMatch(command, /# Agente Desenvolvedor/);
  } finally {
    if (previousProvider === undefined) {
      delete process.env.AGENTS_DEVELOPER_PROVIDER;
    } else {
      process.env.AGENTS_DEVELOPER_PROVIDER = previousProvider;
    }
    if (previousCommand === undefined) {
      delete process.env.AGENTS_DEVELOPER_COMMAND;
    } else {
      process.env.AGENTS_DEVELOPER_COMMAND = previousCommand;
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("bloqueia comando programador sem contexto por padrao", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-orchestrator-"));
  try {
    const execution = fakeExecution(root);
    const promptFile = writeDeveloperPrompt(root, execution);
    assert.throws(
      () => renderDeveloperCommand("codex exec --full-auto faca algo", root, execution, promptFile),
      /deve usar/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("gera diagnostico quando braco programador nao esta configurado", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-orchestrator-"));
  try {
    const diagnostics = developerAutomationDiagnostics(root);
    assert.equal(Array.isArray(diagnostics), true);
    assert.match(diagnostics[0], /Braco programador nao configurado/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inclui achados reprovados no prompt do braco programador", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-orchestrator-"));
  try {
    const execution = fakeExecution(root);
    execution.securityOutput = {
      status: "rejected",
      findings: [
        {
          severity: "HIGH",
          title: "Campo sem validacao",
          file: "src/main/java/com/nexusos/auth/AuthController.java",
          recommendation: "Validar entrada antes de processar."
        }
      ]
    };
    const promptFile = writeDeveloperPrompt(root, execution);
    const content = readFileSync(promptFile, "utf8");
    assert.match(content, /Correcoes solicitadas pelas revisoes/);
    assert.match(content, /Campo sem validacao/);
    assert.match(content, /Validar entrada/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("agente de banco reprova migration destrutiva", () => {
  const findings = databaseFindingsForFile(
    "src/main/resources/db/migration/V999__drop_old_table.sql",
    "DROP TABLE ordem_servico;"
  );
  assert.equal(findings.some((finding) => finding.severity === "CRITICAL"), true);
});

test("agente de banco alerta entidade sem migration", () => {
  const findings = databaseFindingsForFile(
    "src/main/java/com/nexusos/ordemservico/OrdemServico.java",
    "@Entity class OrdemServico { @Column(nullable = false) private String titulo; }",
    { migrationFiles: [] }
  );
  assert.equal(findings.some((finding) => finding.title.includes("Entidade persistida")), true);
});

test("agente de banco reprova ddl automatico perigoso", () => {
  const findings = databaseFindingsForFile(
    "src/main/resources/application-prod.properties",
    "spring.jpa.hibernate.ddl-auto=update"
  );
  assert.equal(findings.some((finding) => finding.severity === "HIGH"), true);
});

test("agente de regras reprova alteracao de status sem auditoria", () => {
  const findings = businessRuleFindingsForFile(
    "src/main/java/com/nexusos/ordemservico/OrdemServicoService.java",
    "void avancar(OrdemServico os) { os.setStatus(StatusOrdemServico.FINALIZADA); }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("rastreabilidade")), true);
});

test("agente de regras reprova acao critica sem permissao", () => {
  const findings = businessRuleFindingsForFile(
    "src/main/java/com/nexusos/ordemservico/OrdemServicoService.java",
    "void cancelar(OrdemServico os, String motivo) { registrarAuditoria(os); os.setStatus(StatusOrdemServico.CANCELADA); }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("permissao")), true);
});

test("agente de regras reprova campo interno no portal do cliente", () => {
  const findings = businessRuleFindingsForFile(
    "nexusos-web/src/app/portal/cliente/page.tsx",
    "export function Portal() { return <span>{ordem.valorPrevisto} {ordem.cobranca}</span>; }"
  );
  assert.equal(findings.some((finding) => finding.severity === "HIGH"), true);
});

test("agente de deploy permite url local em exemplo de ambiente", () => {
  const findings = deploymentFindingsForFile(
    "nexusos-web/.env.example",
    "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1"
  );
  assert.equal(findings.some((finding) => finding.title.includes("ambiente local")), false);
});

test("agente de deploy reprova url publica local em compose", () => {
  const findings = deploymentFindingsForFile(
    "docker-compose.prod.yml",
    "services:\n  web:\n    environment:\n      NEXT_PUBLIC_API_URL: http://localhost:8080/api/v1\n"
  );
  assert.equal(findings.some((finding) => finding.title.includes("ambiente local")), true);
});

test("agente de deploy reprova postgres publicado", () => {
  const findings = deploymentFindingsForFile(
    "docker-compose.yml",
    "services:\n  postgres:\n    image: postgres:18-alpine\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - db:/var/lib/postgresql/data\n"
  );
  assert.equal(findings.some((finding) => finding.title.includes("PostgreSQL publicado")), true);
});

test("agente de deploy alerta swagger em producao", () => {
  const findings = deploymentFindingsForFile(
    "src/main/resources/application-prod.properties",
    "springdoc.swagger-ui.enabled=true"
  );
  assert.equal(findings.some((finding) => finding.title.includes("Swagger")), true);
});

test("agente de acessibilidade reprova botao sem nome acessivel", () => {
  const findings = accessibilityFindingsForFile(
    "nexusos-web/src/components/action.tsx",
    "export function Action() { return <Button><Trash /></Button>; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("Botao sem nome")), true);
});

test("agente de acessibilidade reprova campo sem rotulo", () => {
  const findings = accessibilityFindingsForFile(
    "nexusos-web/src/components/form.tsx",
    "export function Form() { return <Input />; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("Campo sem rotulo")), true);
});

test("agente de acessibilidade reprova imagem sem alt", () => {
  const findings = accessibilityFindingsForFile(
    "nexusos-web/src/components/logo.tsx",
    "export function Logo() { return <img src=\"/logo.png\" />; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("Imagem sem texto")), true);
});

test("agente de acessibilidade reprova clique sem teclado", () => {
  const findings = accessibilityFindingsForFile(
    "nexusos-web/src/components/card.tsx",
    "export function Card() { return <div onClick={abrir}>Abrir</div>; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("teclado")), true);
});

test("agente de performance reprova consulta sem paginacao", () => {
  const findings = performanceFindingsForFile(
    "src/main/java/com/nexusos/ordemservico/OrdemServicoService.java",
    "class OrdemServicoService { List<OrdemServico> listar() { return repository.findAll(); } }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("paginacao")), true);
});

test("agente de performance reprova acesso ao banco dentro de loop", () => {
  const findings = performanceFindingsForFile(
    "src/main/java/com/nexusos/notificacao/NotificacaoService.java",
    "void salvar(List<Item> items) { for (Item item : items) { repository.save(item); } }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("loop")), true);
});

test("agente de performance alerta lista grande sem paginacao", () => {
  const findings = performanceFindingsForFile(
    "nexusos-web/src/app/ordens-servico/page.tsx",
    "export function Page() { return <>{ordens.map((ordem) => <Card key={ordem.id} />)}</>; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("Lista potencialmente grande")), true);
});

test("agente de performance alerta timer sem cleanup", () => {
  const findings = performanceFindingsForFile(
    "nexusos-web/src/components/timer.tsx",
    "useEffect(() => { setInterval(carregar, 1000); }, []);"
  );
  assert.equal(findings.some((finding) => finding.title.includes("Timer")), true);
});

test("agente de produto reprova acao sem feedback", () => {
  const findings = productFindingsForFile(
    "nexusos-web/src/app/ordens-servico/[id]/page.tsx",
    "function Page() { const handleFinalizar = () => finalizar(); return <Button onClick={handleFinalizar}>Finalizar</Button>; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("feedback")), true);
});

test("agente de produto reprova dashboard sem caminho de acao", () => {
  const findings = productFindingsForFile(
    "nexusos-web/src/app/dashboard/page.tsx",
    "function Dashboard() { return <Card><span>OS vencidas</span><strong>{indicador}</strong></Card>; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("dashboard")), true);
});

test("agente de produto alerta listagem sem estado vazio", () => {
  const findings = productFindingsForFile(
    "nexusos-web/src/app/clientes/page.tsx",
    "function Clientes() { return <>{clientes.map((cliente) => <Card key={cliente.id} />)}</>; }"
  );
  assert.equal(findings.some((finding) => finding.title.includes("estado vazio")), true);
});

test("agente de produto alerta backend sem superficie quando pedido fala de tela", () => {
  const findings = productFindingsForChangeSet(
    ["src/main/java/com/nexusos/ordemservico/OrdemServicoService.java"],
    { originalRequest: "Criar botao para aprovar pagamento na tela da OS" }
  );
  assert.equal(findings.some((finding) => finding.title.includes("frontend")), true);
});

test("agente de qa manual cria checklist para fluxo de OS", () => {
  const plan = manualQaPlanForFiles(
    "Melhorar workflow da OS",
    ["src/main/java/com/nexusos/ordemservico/OrdemServicoService.java", "nexusos-web/src/app/ordens-servico/[id]/page.tsx"],
    { acceptanceCriteria: ["Usuario consegue avancar status permitido"] }
  );
  assert.equal(plan.checklist.some((item) => item.area === "Ordem de servico"), true);
  assert.equal(plan.checklist.some((item) => item.area === "Workflow da OS"), true);
  assert.equal(plan.checklist.some((item) => item.area === "Criterio de aceitacao"), true);
});

test("agente de qa manual cria checklist para portal do cliente", () => {
  const plan = manualQaPlanForFiles(
    "Ajustar portal do cliente",
    ["nexusos-web/src/app/portal/cliente/page.tsx"],
    {}
  );
  assert.equal(plan.checklist.some((item) => item.area === "Portal do cliente"), true);
  assert.equal(plan.regressionAreas.includes("Portal do Cliente"), true);
});

test("agente de qa manual inclui deploy quando arquivo operacional muda", () => {
  const plan = manualQaPlanForFiles(
    "Ajustar compose",
    ["docker-compose.yml"],
    {}
  );
  assert.equal(plan.checklist.some((item) => item.area === "Deploy"), true);
  assert.equal(plan.regressionAreas.includes("Deploy/Producao"), true);
});

test("agente de documentacao reprova agente alterado sem docs", () => {
  const findings = documentationFindingsForFiles(
    ["tools/agents/orchestrator.mjs"],
    { changedFileContents: { "tools/agents/orchestrator.mjs": "const novoFluxo = true;" } }
  );
  assert.equal(findings.some((finding) => finding.severity === "HIGH"), true);
});

test("agente de documentacao reprova variavel de ambiente sem exemplo", () => {
  const findings = documentationFindingsForFiles(
    ["src/main/java/com/nexusos/config/EmailConfig.java"],
    { changedFileContents: { "src/main/java/com/nexusos/config/EmailConfig.java": "@Value(\"${EMAIL_API_TOKEN}\") String token;" } }
  );
  assert.equal(findings.some((finding) => finding.title.includes("Variavel de ambiente")), true);
});

test("agente de documentacao aprova quando docs acompanham agente", () => {
  const findings = documentationFindingsForFiles(
    ["tools/agents/orchestrator.mjs", "docs/agents/AGENTS.md"],
    { changedFileContents: { "tools/agents/orchestrator.mjs": "const novoFluxo = true;", "docs/agents/AGENTS.md": "docs" } }
  );
  assert.equal(findings.some((finding) => finding.severity === "HIGH"), false);
});
