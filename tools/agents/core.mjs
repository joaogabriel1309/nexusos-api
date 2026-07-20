import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export const STATES = Object.freeze({
  RECEIVED: "RECEIVED",
  ANALYZING_PROJECT: "ANALYZING_PROJECT",
  CREATING_SPECIFICATION: "CREATING_SPECIFICATION",
  WAITING_FOR_DEVELOPMENT: "WAITING_FOR_DEVELOPMENT",
  DEVELOPING: "DEVELOPING",
  WAITING_FOR_SECURITY_REVIEW: "WAITING_FOR_SECURITY_REVIEW",
  SECURITY_REVIEW: "SECURITY_REVIEW",
  WAITING_FOR_DATABASE_REVIEW: "WAITING_FOR_DATABASE_REVIEW",
  DATABASE_REVIEW: "DATABASE_REVIEW",
  WAITING_FOR_BUSINESS_RULES_REVIEW: "WAITING_FOR_BUSINESS_RULES_REVIEW",
  BUSINESS_RULES_REVIEW: "BUSINESS_RULES_REVIEW",
  WAITING_FOR_UX_REVIEW: "WAITING_FOR_UX_REVIEW",
  UX_REVIEW: "UX_REVIEW",
  WAITING_FOR_TESTS: "WAITING_FOR_TESTS",
  TESTING: "TESTING",
  WAITING_FOR_DEPLOYMENT_REVIEW: "WAITING_FOR_DEPLOYMENT_REVIEW",
  DEPLOYMENT_REVIEW: "DEPLOYMENT_REVIEW",
  WAITING_FOR_MANUAL_QA_REVIEW: "WAITING_FOR_MANUAL_QA_REVIEW",
  MANUAL_QA_REVIEW: "MANUAL_QA_REVIEW",
  WAITING_FOR_DELIVERY: "WAITING_FOR_DELIVERY",
  CREATING_COMMITS: "CREATING_COMMITS",
  PUSHING_BRANCH: "PUSHING_BRANCH",
  CREATING_PULL_REQUEST: "CREATING_PULL_REQUEST",
  WAITING_FOR_HUMAN_REVIEW: "WAITING_FOR_HUMAN_REVIEW",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
});

export const PROTECTED_BRANCHES = new Set(["main", "master", "develop", "production", "release"]);
export const RUNTIME_DIR = ".agents/runtime";
const MAX_OUTPUT = 8000;
const SECRET_PATTERNS = [
  /(ghp|github_pat|glpat)-?[A-Za-z0-9_]{20,}/g,
  /(JWT_SECRET|PASSWORD|TOKEN|PRIVATE_KEY|ACCESS_TOKEN)=\S+/gi
];
const BANNED_COMMANDS = [
  /\brm\s+-rf\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-fd\b/i,
  /\bgit\s+push\s+--force\b/i,
  /\bgit\s+push\s+-f\b/i,
  /\bgit\s+branch\s+-D\b/i,
  /\bDROP\s+DATABASE\b/i,
  /\bDROP\s+TABLE\b/i
];

export function nowIso() {
  return new Date().toISOString();
}

export function redact(value = "") {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), String(value));
}

export function loadDotEnv(root, fileName = ".env") {
  const file = join(root, fileName);
  if (!existsSync(file)) {
    return {};
  }

  const loaded = {};
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
    loaded[key] = key.includes("TOKEN") || key.includes("PASSWORD") || key.includes("SECRET") ? "[REDACTED]" : value;
  }
  return loaded;
}

export function assertSafeCommand(command) {
  const hit = BANNED_COMMANDS.find((pattern) => pattern.test(command));
  if (hit) {
    throw new Error(`Comando bloqueado por politica de seguranca: ${command}`);
  }
}

export function run(command, options = {}) {
  assertSafeCommand(command);
  const result = spawnSync(command, {
    cwd: options.cwd,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
    timeout: options.timeoutMs ?? 120000
  });
  return {
    command,
    code: result.status ?? 1,
    stdout: redact((result.stdout ?? "").slice(-MAX_OUTPUT)),
    stderr: redact((result.stderr ?? "").slice(-MAX_OUTPUT))
  };
}

export function ensureInsideProject(root, target) {
  const projectRoot = resolve(root);
  const resolved = resolve(root, target);
  if (!resolved.startsWith(projectRoot)) {
    throw new Error(`Caminho fora do projeto bloqueado: ${target}`);
  }
  return resolved;
}

export function createExecutionId(root) {
  const prefix = `AGT-${new Date().getFullYear()}-`;
  const dir = join(root, RUNTIME_DIR);
  mkdirSync(dir, { recursive: true });
  const next = readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && item.name.startsWith(prefix))
    .length + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function executionPath(root, id) {
  return join(root, RUNTIME_DIR, id, "execution.json");
}

export function loadExecution(root, id) {
  const file = executionPath(root, id);
  if (!existsSync(file)) {
    throw new Error(`Execucao nao encontrada: ${id}`);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

export function saveExecution(root, execution) {
  const dir = join(root, RUNTIME_DIR, execution.id);
  mkdirSync(dir, { recursive: true });
  execution.updatedAt = nowIso();
  writeFileSync(join(dir, "execution.json"), `${JSON.stringify(execution, null, 2)}\n`);
}

export function transition(root, execution, status, detail = "") {
  execution.status = status;
  const at = nowIso();
  execution.history.push({ at, status, detail });
  saveExecution(root, execution);
  if (process.env.AGENTS_PROGRESS === "1") {
    const message = detail ? `${status} - ${detail}` : status;
    console.log(`[${new Date(at).toLocaleTimeString()}] ${message}`);
  }
}

export function newExecution(root, originalRequest) {
  const id = createExecutionId(root);
  const createdAt = nowIso();
  const execution = {
    id,
    originalRequest,
    status: STATES.RECEIVED,
    currentAgent: null,
    provider: "github",
    remote: "origin",
    branch: "",
    targetBranch: "",
    createdAt,
    updatedAt: createdAt,
    poOutput: null,
    developerOutput: null,
    securityOutput: null,
    databaseOutput: null,
    businessRulesOutput: null,
    testOutput: null,
    deploymentOutput: null,
    manualQaOutput: null,
    deliveryOutput: null,
    errors: [],
    history: [{ at: createdAt, status: STATES.RECEIVED, detail: "Solicitacao recebida" }]
  };
  saveExecution(root, execution);
  return execution;
}

export function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "tarefa";
}

export function branchNameFor(request, prefix = "feat") {
  const slug = slugify(request)
    .replace(/^implemente-/, "")
    .replace(/^adicionar-/, "")
    .replace(/^criar-/, "");
  return `${prefix}/${slug}`.slice(0, 80);
}

export function listRuntime(root) {
  const dir = join(root, RUNTIME_DIR);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => {
      try {
        return loadExecution(root, item.name);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function changedFiles(root) {
  const tracked = run("git diff --name-only", { cwd: root }).stdout.split(/\r?\n/).filter(Boolean);
  const untracked = run("git ls-files --others --exclude-standard", { cwd: root }).stdout.split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].filter((file) => isCommittableFile(file));
}

export function isCommittableFile(file) {
  const normalized = file.replace(/\\/g, "/");
  return !(
    normalized.startsWith(".agents/runtime/") ||
    normalized.endsWith(".env") ||
    normalized.includes("/.env") ||
    normalized.endsWith(".log") ||
    normalized.includes("node_modules/") ||
    normalized.includes("target/") ||
    normalized.includes(".next/")
  );
}

export function repositoryFacts(root) {
  const remote = run("git remote -v", { cwd: root });
  const branch = run("git branch --show-current", { cwd: root });
  const status = run("git status --short", { cwd: root });
  return {
    remote: remote.stdout.trim(),
    currentBranch: branch.stdout.trim(),
    clean: status.stdout.trim().length === 0,
    status: status.stdout.trim()
  };
}

export function analyzeProject(root) {
  const hasFrontend = existsSync(join(root, "nexusos-web", "package.json"));
  const migrations = existsSync(join(root, "src", "main", "resources", "db", "migration"))
    ? readdirSync(join(root, "src", "main", "resources", "db", "migration")).length
    : 0;
  return {
    languages: ["Java 21", "TypeScript"],
    frameworks: ["Spring Boot 3.5", "Next.js 15", "React 19", "Tailwind CSS"],
    backend: "API REST em Spring Boot com camadas Controller, Service, Repository, DTOs e Flyway.",
    frontend: hasFrontend ? "Aplicacao Next.js em nexusos-web usando App Router, React Query, Axios e componentes locais." : "Nao detectado.",
    database: `PostgreSQL com Flyway (${migrations} migrations detectadas).`,
    orm: "Spring Data JPA/Hibernate",
    authentication: "JWT Bearer e cookies HttpOnly para refresh token.",
    authorization: "Spring Security com perfis ADMIN e DESENVOLVEDOR, usando @PreAuthorize em controllers/servicos.",
    tests: "JUnit/Spring Boot no backend; typecheck/build no frontend; testes especificos do sistema de agentes em node:test.",
    git: repositoryFacts(root),
    docker: {
      compose: existsSync(join(root, "docker-compose.yml")),
      dockerfile: existsSync(join(root, "Dockerfile"))
    }
  };
}

export function writeMarkdown(root, relativePath, content) {
  ensureInsideProject(root, relativePath);
  const file = join(root, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

export function shellQuote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

export function summarizeCommand(result) {
  return {
    command: result.command,
    code: result.code,
    stdout: result.stdout.slice(-1200),
    stderr: result.stderr.slice(-1200)
  };
}

export function safeAddCommand(files) {
  if (files.length === 0) {
    return "";
  }
  return `git add -- ${files.map(shellQuote).join(" ")}`;
}

export function runtimeFile(root, execution, name) {
  const safeName = basename(name);
  return join(root, RUNTIME_DIR, execution.id, safeName);
}
