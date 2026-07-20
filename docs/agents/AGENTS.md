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

Quando o braco programador esta configurado, reprovacoes de Seguranca, Banco, Regras de Negocio, Produto, UX, Acessibilidade, Performance, Testes, Deploy ou Documentacao retornam automaticamente para o Desenvolvedor. O novo prompt inclui os achados reprovados para orientar a correcao e o fluxo continua ate aprovar ou atingir o limite de tentativas do agente revisor.

## Seguranca

Revisa arquivos alterados contra segredos, comandos perigosos, XSS basico e path traversal. Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento.

Arquivos `.env.example` podem declarar nomes de variaveis sensiveis com valores vazios ou placeholders sem serem tratados como segredo real. Tokens reais, chaves privadas e segredos fora de exemplos continuam bloqueados.

## Banco de Dados

Revisa migrations Flyway, entidades JPA, repositories, queries e configuracoes de persistencia. O objetivo e evitar perda de dados, schema fora de ordem, `ddl-auto` perigoso, SQL nativo concatenado e mudancas em entidades sem migration.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Regras de Negocio

Revisa fluxos do produto e invariantes do NexusOS: transicao de status da OS, acoes criticas com motivo, auditoria, notificacoes, permissao por perfil, exposicao de campos no portal do cliente e impactos em dashboard/listagens.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes para revisao manual.

## Produto

Revisa valor e coerencia de produto antes da UX: fluxo principal, caminho de acao, estados vazio/loading/erro, feedback de sucesso/falha, indicadores acionaveis, portal orientado a decisao e alinhamento entre backend e superficie de uso.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## UX

Revisa arquivos alterados do frontend para avaliar simplicidade de uso, clareza de textos, responsividade mobile/tablet/desktop, tamanho de modais e risco de rotinas confusas. Achados `HIGH` reprovam a etapa e retornam ao desenvolvimento; achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Acessibilidade

Revisa arquivos alterados do frontend para detectar problemas de acessibilidade: botoes sem nome acessivel, campos sem rotulo, imagens sem `alt`, elementos clicaveis sem teclado, foco invisivel, contraste possivelmente baixo, dialogs sem titulo/descricao e tabelas sem contexto.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Performance

Revisa riscos de desempenho em backend e frontend: consultas sem paginacao, acesso ao banco dentro de loops, relacoes JPA potencialmente pesadas, transacoes com chamadas externas, buscas sem cache/cancelamento, listas grandes sem paginacao/virtualizacao, imagens sem otimizacao e timers sem cleanup.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Testes

Executa `mvnw test`, `pnpm --dir nexusos-web typecheck` e `pnpm --dir nexusos-web build` quando os arquivos correspondentes existem.

## Deploy/Producao

Revisa riscos de publicacao antes da entrega: Dockerfile, Docker Compose, variaveis publicas, CORS, Swagger em producao, URLs `localhost`, exposicao do PostgreSQL, volumes persistentes, restart policy, healthcheck e proxy reverso.

Defaults locais em `.env.example` e em `src/main/resources/application.yaml` sao aceitos como exemplos de desenvolvimento. URLs locais continuam sendo bloqueadas em arquivos de producao, Compose, Nginx ou configuracoes publicaveis.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## QA Manual

Prepara um checklist manual orientado pelos arquivos alterados e criterios de aceitacao. Cobre fluxo principal, permissoes, regressao basica, mobile/desktop, portal do cliente, OS, dashboard, notificacoes, autenticacao, banco e deploy quando esses modulos forem afetados.

Nao substitui testes automatizados. A saida fica registrada no relatorio de entrega para guiar a validacao humana antes de publicar.

## Documentacao

Revisa se mudancas no produto, API, variaveis de ambiente, deploy ou sistema de agentes exigem documentacao. Gera checklist de documentacao e bloqueia casos criticos, como alteracao do pipeline de agentes sem docs ou variavel de ambiente nova sem exemplo versionado.

Achados `CRITICAL` ou `HIGH` reprovam a etapa e retornam ao desenvolvimento. Achados `MEDIUM` e `LOW` ficam registrados como recomendacoes.

## Entrega

Cria commit e faz push direto para a branch alvo. Nao cria Pull Request e nao faz merge.
