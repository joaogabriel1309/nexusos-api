# Agentes

## PO

Analisa o pedido, contexto do projeto, modulos afetados, regras de negocio, riscos e criterios de aceitacao. Nao altera codigo da aplicacao.

## Desenvolvedor

Usa a branch alvo (`master` por padrao), gera `.agents/runtime/<ID>/developer-prompt.md`, executa o braco programador quando configurado e registra arquivos alterados.

Formas de ativar:

- `AGENTS_DEVELOPER_PROVIDER=codex`: usa `codex exec --full-auto {prompt}`.
- `AGENTS_DEVELOPER_COMMAND=...`: usa um comando customizado.

Placeholders aceitos no comando:

- `{prompt}`: conteudo completo do prompt tecnico.
- `{promptFile}`: caminho do arquivo `developer-prompt.md`.
- `{executionFile}`: caminho do `execution.json`.
- `{id}`, `{branch}`, `{targetBranch}`, `{request}`, `{root}`.

Por seguranca, comandos customizados precisam usar `{prompt}`, `{promptFile}` ou `{executionFile}`. Para liberar comando bruto, configure `AGENTS_DEVELOPER_ALLOW_RAW_COMMAND=true`.

Sem provedor/comando, a execucao fica em `WAITING_FOR_DEVELOPMENT` para implementacao manual na branch alvo e retomada com `pnpm agents:resume`.

## Seguranca

Revisa arquivos alterados contra segredos, comandos perigosos, XSS basico e path traversal. Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento.

## Banco de Dados

Revisa migrations Flyway, entidades JPA, repositories, queries e configuracoes de persistencia. O objetivo e evitar perda de dados, schema fora de ordem, `ddl-auto` perigoso, SQL nativo concatenado e mudancas em entidades sem migration.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Regras de Negocio

Revisa fluxos do produto e invariantes do NexusOS: transicao de status da OS, acoes criticas com motivo, auditoria, notificacoes, permissao por perfil, exposicao de campos no portal do cliente e impactos em dashboard/listagens.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes para revisao manual.

## UX

Revisa arquivos alterados do frontend para avaliar simplicidade de uso, clareza de textos, responsividade mobile/tablet/desktop, tamanho de modais e risco de rotinas confusas. Achados `HIGH` reprovam a etapa e retornam ao desenvolvimento; achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Testes

Executa `mvnw test`, `pnpm --dir nexusos-web typecheck` e `pnpm --dir nexusos-web build` quando os arquivos correspondentes existem.

## Entrega

Cria commit e faz push direto para a branch alvo. Nao cria Pull Request e nao faz merge.
