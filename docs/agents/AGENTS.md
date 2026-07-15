# Agentes

## PO

Analisa o pedido, contexto do projeto, modulos afetados, regras de negocio, riscos e criterios de aceitacao. Nao altera codigo da aplicacao.

## Desenvolvedor

Cria branch de tarefa, executa `AGENTS_DEVELOPER_COMMAND` quando configurado e registra arquivos alterados. Sem esse comando, deixa a execucao em `WAITING_FOR_DEVELOPMENT` para que a implementacao seja feita na branch e retomada com `pnpm agents:resume`.

## Seguranca

Revisa arquivos alterados contra segredos, comandos perigosos, XSS basico e path traversal. Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento.

## Testes

Executa `mvnw test`, `pnpm --dir nexusos-web typecheck` e `pnpm --dir nexusos-web build` quando os arquivos correspondentes existem.

## Entrega

Cria commit, faz push para a branch da tarefa e abre ou atualiza Pull Request no GitHub. Nao faz merge e nao aprova PR.
