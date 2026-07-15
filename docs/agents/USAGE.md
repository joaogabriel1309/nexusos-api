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

Opcionalmente configure:

```bash
AGENTS_DEVELOPER_COMMAND="comando seguro que implementa a tarefa"
```

Sem esse comando, o fluxo cria a especificacao e a branch, depois aguarda implementacao externa.
