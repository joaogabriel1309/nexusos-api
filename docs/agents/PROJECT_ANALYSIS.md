# Analise do projeto NexusOS

## Visao geral

O NexusOS e um sistema de gerenciamento de Ordens de Servico com backend em Spring Boot e frontend em Next.js. O produto cobre cadastro de clientes, projetos, usuarios, ordens de servico, portal do cliente, notificacoes, auditoria, pagamentos, anexos, comentarios, checklist, apontamentos de tempo e dashboard operacional.

## Arquitetura encontrada

- Backend REST em `src/main/java/com/nexusos`, organizado por modulo de dominio.
- Frontend em `nexusos-web`, usando App Router do Next.js e chamadas HTTP por servicos em `src/services`.
- Banco PostgreSQL com migrations Flyway em `src/main/resources/db/migration`.
- Execucao local com Docker Compose para PostgreSQL.
- Deploy por Dockerfile e variaveis de ambiente.

## Tecnologias utilizadas

- Java 21
- Spring Boot 3.5
- Spring Web, Spring Data JPA, Spring Security
- Flyway
- PostgreSQL
- JWT com JJWT
- Lombok
- Maven
- TypeScript
- Next.js 15
- React 19
- TanStack Query
- Axios
- Tailwind CSS
- PNPM no frontend
- Docker e Docker Compose

## Modulos principais

- `auth`: login, refresh token, cookies e rate limit.
- `security`: filtros JWT, CORS, autorizacao e configuracao HTTP.
- `ordemservico`: workflow, SLA, analise, pagamento, finalizacao e responsavel.
- `cliente`, `projeto`, `usuario`: cadastros centrais.
- `portalcliente`: acesso publico por token do cliente.
- `dashboard`: indicadores gerenciais.
- `notificacao`: alertas internos.
- `auditoria`, `comentario`, `checklist`, `apontamento`, `anexo`: suporte operacional.

## Autenticacao e autorizacao

A autenticacao interna usa JWT. O backend aceita login em `/api/v1/auth/**` e protege os demais endpoints com Spring Security. O projeto possui perfis `ADMIN` e `DESENVOLVEDOR`; as regras de acesso ficam principalmente nos controllers e services com Spring Security e validacoes de dominio.

O portal do cliente usa token publico especifico e expiração configuravel.

## Estrutura de testes

O backend possui testes JUnit/Spring Boot em `src/test`. O frontend possui scripts de `typecheck` e `build`. O novo sistema de agentes adiciona testes com `node:test` em `tools/agents/tests`.

## Git e GitHub

O remote `origin` aponta para GitHub. O sistema de agentes commita e envia direto para a branch alvo (`master` por padrao).

## Docker e variaveis de ambiente

`docker-compose.yml` sobe PostgreSQL. A API carrega `.env` por `spring.config.import`. O frontend possui `.env.example` separado. O sistema de agentes usa variaveis opcionais `AGENTS_TARGET_BRANCH`, `AGENTS_DEVELOPER_COMMAND`, `GH_TOKEN` e `GITHUB_TOKEN`, sem salvar valores reais.

## Riscos encontrados

- O projeto tem backend e frontend no mesmo repositorio, entao tarefas podem afetar contratos entre camadas.
- A automacao de desenvolvimento nao deve executar comandos destrutivos ou tocar em arquivos fora do projeto.
- Push depende de permissao Git configurada para o remote.
- Uploads e anexos exigem revisao rigorosa de path traversal, MIME type, tamanho e permissao.
- Builds de frontend podem demorar e gerar artefatos locais que nao devem entrar no commit.

## Estrategia escolhida para os agentes

Foi criado um CLI local em Node.js, sem novas dependencias, acionado por PNPM na raiz. A persistencia fica em `.agents/runtime/<ID>/execution.json`, ignorada pelo Git. O orquestrador controla todas as transicoes de estado e chama agentes deterministas:

1. PO: gera especificacao estruturada.
2. Desenvolvedor: usa a branch alvo e executa `AGENTS_DEVELOPER_COMMAND` quando configurado, ou aguarda implementacao externa na branch.
3. Seguranca: revisa arquivos alterados e bloqueia achados criticos/altos.
4. Testes: executa Maven, typecheck e build do frontend.
5. Entrega: cria commit e faz push direto para a branch alvo.

Essa decisao preserva a arquitetura da aplicacao e evita expor endpoints administrativos perigosos em producao.
