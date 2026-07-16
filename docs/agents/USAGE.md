# Uso

## Criar tarefa

```bash
pnpm agents:task "Implemente upload de imagens nas Ordens de Servico"
```

## Consultar status

```bash
pnpm agents:status AGT-2026-0001
```

## Retomar execucao

```bash
pnpm agents:resume AGT-2026-0001
```

## Listar execucoes

```bash
pnpm agents:list
```

## Automacao do desenvolvimento

Para usar o braco programador com Codex CLI:

```bash
AGENTS_DEVELOPER_PROVIDER=codex
```

Essas variaveis podem ser definidas no terminal ou no `.env` da raiz do projeto. O CLI carrega o `.env` automaticamente sem sobrescrever variaveis ja existentes no ambiente.

Ou configure um comando customizado:

```bash
AGENTS_DEVELOPER_COMMAND="codex exec --full-auto {prompt}"
```

Placeholders disponiveis: `{prompt}`, `{promptFile}`, `{executionFile}`, `{id}`, `{branch}`, `{targetBranch}`, `{request}`, `{root}`.

Sem provedor/comando, o fluxo cria a especificacao e aguarda implementacao externa na branch alvo.
