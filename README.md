# NexusOS API

Sistema moderno de gerenciamento de Ordens de Servico desenvolvido com Java + Spring Boot, focado em workflow tecnico, produtividade, auditoria, controle de demandas e arquitetura enterprise.

## Stack

- Java 21
- Spring Boot 3.x
- Maven
- PostgreSQL
- Spring Web, Spring Data JPA, Spring Security
- JWT
- Bean Validation
- Flyway
- Lombok
- Springdoc OpenAPI/Swagger
- Docker e Docker Compose

## Como rodar localmente

1. Copie as variaveis de ambiente:

```bash
cp .env.example .env
```

2. Suba o PostgreSQL:

```bash
docker compose up -d
```

3. Execute a API:

```bash
./mvnw spring-boot:run
```

No Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

## Swagger

Com a aplicacao em execucao, acesse:

- http://localhost:8080/swagger-ui.html
- http://localhost:8080/v3/api-docs

## Autenticacao

Os endpoints internos usam JWT Bearer Token. O login inicial e realizado em:

```http
POST /api/v1/auth/login
```

## Sistema local de agentes

O projeto possui um orquestrador local para fluxo de agentes de desenvolvimento com GitHub:

```bash
pnpm agents:task "Implemente upload de imagens nas Ordens de Servico"
pnpm agents:status AGT-2026-0001
pnpm agents:resume AGT-2026-0001
pnpm agents:list
```

O fluxo gera especificacao, cria branch de tarefa, executa revisao de seguranca, testes/build e, quando aprovado, cria push e Pull Request via GitHub CLI (`gh`). O merge nunca e realizado automaticamente.

Para ativar o braco programador automatico com Codex CLI, configure:

```bash
AGENTS_DEVELOPER_PROVIDER=codex
```

Pode ser no terminal ou no `.env` da raiz.

Ou use um comando customizado:

```bash
AGENTS_DEVELOPER_COMMAND="codex exec --full-auto {prompt}"
```

Documentacao completa em `docs/agents/`.
