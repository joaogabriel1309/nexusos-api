import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newExecution } from "../core.mjs";
import { businessRuleFindingsForFile, databaseFindingsForFile, deploymentFindingsForFile, developerAutomationDiagnostics, manualQaPlanForFiles, renderDeveloperCommand, resolveDeveloperCommand, writeDeveloperPrompt } from "../orchestrator.mjs";

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

test("agente de deploy reprova url publica local", () => {
  const findings = deploymentFindingsForFile(
    "nexusos-web/.env.example",
    "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1"
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
