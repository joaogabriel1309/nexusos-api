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
