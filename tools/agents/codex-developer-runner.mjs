import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const promptFile = process.argv[2] ? resolve(process.argv[2]) : "";

if (!promptFile || !existsSync(promptFile)) {
  console.error("Arquivo de prompt do agente desenvolvedor nao encontrado.");
  process.exit(1);
}

const npmBin = process.env.APPDATA ? `${process.env.APPDATA}\\npm` : "";
const pathKey = process.platform === "win32" ? "Path" : "PATH";
const currentPath = process.env[pathKey] || process.env.PATH || "";
const env = {
  ...process.env,
  [pathKey]: npmBin ? `${npmBin}${process.platform === "win32" ? ";" : ":"}${currentPath}` : currentPath
};

const instruction = [
  `Leia integralmente o arquivo de especificacao em: ${promptFile}`,
  "Depois implemente a tarefa no repositorio atual.",
  "Nao faca commit, push, merge ou pull request.",
  "Ao terminar, deixe as alteracoes no working tree para o orquestrador revisar."
].join("\n");

const command = process.platform === "win32" ? "codex.cmd" : "codex";
const result = spawnSync(
  command,
  ["exec", "--sandbox", "workspace-write", instruction],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env
  }
);

process.exit(result.status ?? 1);
