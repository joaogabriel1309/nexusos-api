#!/usr/bin/env node
import { cwd } from "node:process";
import { listRuntime, loadDotEnv, loadExecution, repositoryFacts, STATES } from "./core.mjs";
import { resumeTask, startTask } from "./orchestrator.mjs";

const root = cwd();
loadDotEnv(root);
const [command, ...args] = process.argv.slice(2);

try {
  if (command === "task") {
    const request = args.join(" ").trim();
    if (!request) throw new Error('Uso: pnpm agents:task "Descricao da tarefa"');
    preflight();
    enableProgress();
    const execution = await startTask(root, request);
    printReport(execution);
  } else if (command === "status") {
    const id = args[0];
    if (!id) throw new Error("Uso: pnpm agents:status ID_DA_EXECUCAO");
    printReport(loadExecution(root, id));
  } else if (command === "resume") {
    const id = args[0];
    if (!id) throw new Error("Uso: pnpm agents:resume ID_DA_EXECUCAO");
    enableProgress();
    const execution = await resumeTask(root, id);
    printReport(execution);
  } else if (command === "list") {
    const items = listRuntime(root);
    if (items.length === 0) {
      console.log("Nenhuma execucao encontrada.");
    } else {
      for (const item of items) {
        console.log(`${item.id}\t${item.status}\t${item.branch || "-"}\t${item.originalRequest}`);
      }
    }
  } else {
    throw new Error("Comando invalido. Use task, status, resume ou list.");
  }
} catch (error) {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
}

function enableProgress() {
  process.env.AGENTS_PROGRESS = process.env.AGENTS_PROGRESS ?? "1";
}

function preflight() {
  const facts = repositoryFacts(root);
  if (!facts.remote.includes("github.com")) {
    throw new Error("Remote origin nao parece apontar para GitHub. Nao alterei o remote.");
  }
  if (!facts.currentBranch) {
    throw new Error("Nao foi possivel identificar a branch atual.");
  }
}

function printReport(execution) {
  const delivery = execution.deliveryOutput ?? {};
  const tests = execution.testOutput?.testResults;
  console.log(`Execucao: ${execution.id}`);
  console.log(`Status: ${humanStatus(execution.status)}`);
  console.log(`Branch de trabalho: ${execution.branch || "-"}`);
  console.log(`Branch de destino: ${execution.targetBranch || "-"}`);
  console.log(`Seguranca: ${execution.securityOutput?.status ?? "-"}`);
  console.log(`Banco de dados: ${execution.databaseOutput?.status ?? "-"}`);
  console.log(`UX: ${execution.uxOutput?.status ?? "-"}`);
  console.log(`Testes: ${tests ? `${tests.passed} aprovados, ${tests.failed} falhos` : "-"}`);
  console.log(`Push: ${delivery.push ?? "-"}`);
  console.log(`Pull Request: ${delivery.pullRequestCreated ? "criado" : "nao utilizado"}`);
  console.log(`URL: ${delivery.pullRequestUrl ?? "-"}`);
  console.log(`Entrega direta: ${delivery.commitsCreated && delivery.push === "success" ? "realizada" : "-"}`);
  if (execution.status === STATES.WAITING_FOR_DEVELOPMENT) {
    console.log("Proximo passo: implemente na branch alvo ou configure AGENTS_DEVELOPER_COMMAND e rode pnpm agents:resume <ID>.");
  }
  if (execution.errors?.length) {
    console.log("Erros:");
    for (const error of execution.errors) console.log(`- ${error.message}`);
  }
}

function humanStatus(status) {
  if (status === STATES.WAITING_FOR_HUMAN_REVIEW) return "aguardando revisao humana";
  if (status === STATES.WAITING_FOR_DEVELOPMENT) return "aguardando desenvolvimento";
  if (status === STATES.FAILED) return "falhou";
  return status;
}
