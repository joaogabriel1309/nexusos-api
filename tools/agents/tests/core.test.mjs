import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PROTECTED_BRANCHES,
  assertSafeCommand,
  branchNameFor,
  createExecutionId,
  isCommittableFile,
  loadDotEnv,
  newExecution,
  redact,
  safeAddCommand,
  saveExecution,
  loadExecution
} from "../core.mjs";

test("bloqueia comandos destrutivos", () => {
  assert.throws(() => assertSafeCommand("git reset --hard"), /bloqueado/);
  assert.throws(() => assertSafeCommand("git push --force"), /bloqueado/);
  assert.throws(() => assertSafeCommand("DROP TABLE usuarios"), /bloqueado/);
});

test("gera branch segura e nao protegida", () => {
  const branch = branchNameFor("Implemente upload de imagens nas Ordens de Servico");
  assert.match(branch, /^feat\/[a-z0-9-]+$/);
  assert.equal(PROTECTED_BRANCHES.has(branch), false);
});

test("filtra arquivos que nao devem entrar no commit", () => {
  assert.equal(isCommittableFile(".agents/runtime/AGT-1/execution.json"), false);
  assert.equal(isCommittableFile(".env"), false);
  assert.equal(isCommittableFile("src/main/java/App.java"), true);
});

test("redige tokens e variaveis sensiveis", () => {
  const text = "GH_TOKEN=ghp_1234567890123456789012345678901234567890";
  assert.equal(redact(text).includes("ghp_"), false);
  assert.equal(redact(text).includes("[REDACTED]"), true);
});

test("carrega variaveis locais do .env sem sobrescrever ambiente", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-"));
  const original = process.env.AGENTS_TEST_KEEP;
  try {
    process.env.AGENTS_TEST_KEEP = "original";
    writeFileSync(join(root, ".env"), "AGENTS_TEST_VALUE=ok\nAGENTS_TEST_KEEP=novo\nGH_TOKEN=secret-token\n");
    const loaded = loadDotEnv(root);
    assert.equal(process.env.AGENTS_TEST_VALUE, "ok");
    assert.equal(process.env.AGENTS_TEST_KEEP, "original");
    assert.equal(loaded.GH_TOKEN, "[REDACTED]");
  } finally {
    if (original === undefined) {
      delete process.env.AGENTS_TEST_KEEP;
    } else {
      process.env.AGENTS_TEST_KEEP = original;
    }
    delete process.env.AGENTS_TEST_VALUE;
    delete process.env.GH_TOKEN;
    rmSync(root, { recursive: true, force: true });
  }
});

test("gera git add somente com arquivos explicitamente informados", () => {
  const command = safeAddCommand(["README.md", "tools/agents/core.mjs"]);
  assert.match(command, /^git add -- /);
  assert.equal(command.includes("git add ."), false);
});

test("persiste e carrega execucao", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-"));
  try {
    const execution = newExecution(root, "Teste");
    execution.branch = "feat/teste";
    saveExecution(root, execution);
    assert.equal(loadExecution(root, execution.id).branch, "feat/teste");
    assert.equal(createExecutionId(root), "AGT-2026-0002".replace("2026", String(new Date().getFullYear())));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
