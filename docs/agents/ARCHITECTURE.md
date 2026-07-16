# Arquitetura do sistema de agentes

O sistema de agentes e uma ferramenta local de desenvolvimento, fora do runtime da API Spring Boot e fora do frontend Next.js.

## Componentes

- `tools/agents/cli.mjs`: interface por terminal.
- `tools/agents/orchestrator.mjs`: maquina de estados e controle dos agentes.
- `tools/agents/core.mjs`: persistencia, protecoes, comandos seguros e utilitarios.
- `.agents/runtime/`: estado e relatorios de execucao, ignorados pelo Git.
- `docs/agents/`: documentacao operacional.

## Justificativa

A ferramenta executa Git, build e testes. Rodar isso dentro da API web criaria risco operacional. O CLI local reduz superficie de ataque, evita endpoints administrativos e aproveita a autenticacao ja configurada no ambiente do desenvolvedor.

## Estados

O fluxo implementa os estados:

`RECEIVED`, `ANALYZING_PROJECT`, `CREATING_SPECIFICATION`, `WAITING_FOR_DEVELOPMENT`, `DEVELOPING`, `WAITING_FOR_SECURITY_REVIEW`, `SECURITY_REVIEW`, `WAITING_FOR_UX_REVIEW`, `UX_REVIEW`, `WAITING_FOR_TESTS`, `TESTING`, `WAITING_FOR_DELIVERY`, `CREATING_COMMITS`, `PUSHING_BRANCH`, `CREATING_PULL_REQUEST`, `WAITING_FOR_HUMAN_REVIEW`, `COMPLETED`, `FAILED`.

## Persistencia

Cada execucao possui `execution.json` com pedido original, branch, target branch, saidas dos agentes, erros e historico de transicoes.

## Integracao com GitHub

O agente de entrega cria commit local e faz `git push origin <branch-alvo>` direto. O GitHub CLI (`gh`) nao e necessario nesse modo.
