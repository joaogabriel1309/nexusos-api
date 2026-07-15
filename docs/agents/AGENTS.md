# Agentes

## PO

Analisa o pedido, contexto do projeto, modulos afetados, regras de negocio, riscos e criterios de aceitacao. Nao altera codigo da aplicacao.

## Desenvolvedor

Cria branch de tarefa, gera `.agents/runtime/<ID>/developer-prompt.md`, executa o braco programador quando configurado e registra arquivos alterados.

Formas de ativar:

- `AGENTS_DEVELOPER_PROVIDER=codex`: usa `codex exec --full-auto {prompt}`.
- `AGENTS_DEVELOPER_COMMAND=...`: usa um comando customizado.

Placeholders aceitos no comando:

- `{prompt}`: conteudo completo do prompt tecnico.
- `{promptFile}`: caminho do arquivo `developer-prompt.md`.
- `{executionFile}`: caminho do `execution.json`.
- `{id}`, `{branch}`, `{targetBranch}`, `{request}`, `{root}`.

Por seguranca, comandos customizados precisam usar `{prompt}`, `{promptFile}` ou `{executionFile}`. Para liberar comando bruto, configure `AGENTS_DEVELOPER_ALLOW_RAW_COMMAND=true`.

Sem provedor/comando, a execucao fica em `WAITING_FOR_DEVELOPMENT` para implementacao manual na branch e retomada com `pnpm agents:resume`.

## Seguranca

Revisa arquivos alterados contra segredos, comandos perigosos, XSS basico e path traversal. Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento.

## Testes

Executa `mvnw test`, `pnpm --dir nexusos-web typecheck` e `pnpm --dir nexusos-web build` quando os arquivos correspondentes existem.

## Entrega

Cria commit, faz push para a branch da tarefa e abre ou atualiza Pull Request no GitHub. Nao faz merge e nao aprova PR.
