# Auditoria de Seguranca - NexusOS

Data: 2026-05-21

## Resumo

Auditoria ofensiva/defensiva realizada sobre backend Spring Boot e frontend Next.js do NexusOS, com foco em JWT, autorizacao, upload, CORS, headers, tratamento de erros, configuracao de ambiente e dependencias.

## Vulnerabilidades encontradas e tratadas

| Risco | Nivel | Achado | Correcao aplicada |
| --- | --- | --- | --- |
| Criacao publica de usuarios apos bootstrap | ALTO | `POST /api/v1/usuarios` estava liberado para qualquer origem autenticada ou anonima | Primeiro usuario continua permitido; demais criacoes exigem `ROLE_ADMIN` no service |
| Rotas de escrita sem autorizacao por perfil | ALTO | Controllers dependiam apenas de token valido | Adicionado `@PreAuthorize` para usuarios, clientes, projetos, OS, comentarios, checklist, apontamentos e anexos |
| Token JWT invalido podia propagar excecao | MEDIO | Filtro extraia claims sem tratamento local | Token malformado/assinatura invalida agora limpa contexto e retorna 401 |
| Segredo JWT fraco/default | ALTO | Default inseguro no `.env.example` e aceite de segredo curto | `JwtService` rejeita segredo vazio/default/menor que 256 bits; `.env.example` orienta gerar Base64 forte |
| Upload sem validacao suficiente | ALTO | Nome original era concatenado; sem limite por extensao/MIME/tamanho | Anexos agora validam tamanho, extensao, MIME type, normalizacao de path e nome seguro |
| Headers de seguranca ausentes | MEDIO | CSP, HSTS, Referrer e Permissions Policy nao estavam configurados explicitamente | Configurados headers via Spring Security |
| Tratamento de erro incompleto | MEDIO | Alguns erros de autorizacao/tipo poderiam virar resposta generica | Adicionados handlers para 403, parametros invalidos, media/method invalidos e rate limit |
| Brute force no login | MEDIO | Login nao possuia throttling | Adicionado rate limit em memoria por email + IP |

## Pontos ainda pendentes

- JWT ainda fica em `localStorage` no frontend. Para producao rigorosa, migrar para cookie `HttpOnly`, `Secure`, `SameSite`.
- Swagger continua liberado pela configuracao atual. Recomendado proteger ou desabilitar em producao.
- Rate limit atual e em memoria. Em ambiente escalado, migrar para Redis/Bucket4j ou gateway.
- Nao ha politica de refresh token com rotacao/revogacao. Recomendado persistir refresh tokens com hash, expiracao e revogacao.
- Logs de seguranca ainda sao basicos. Recomendado registrar login falho/sucesso, acesso negado e upload.
- IDOR ainda depende das regras de negocio. Caso perfil `CLIENTE` acesse o sistema, criar escopo por cliente/proprietario.
- `npm audit` apontou vulnerabilidade moderada transitiva em `postcss` via `next`, sem fix automatico disponivel no momento.

## Endpoints revisados

- `/api/v1/auth/login`
- `/api/v1/auth/refresh`
- `/api/v1/usuarios/**`
- `/api/v1/clientes/**`
- `/api/v1/projetos/**`
- `/api/v1/ordens-servico/**`
- `/api/v1/ordens-servico/{id}/comentarios`
- `/api/v1/ordens-servico/{id}/checklist`
- `/api/v1/checklist/{id}/concluir`
- `/api/v1/ordens-servico/{id}/apontamentos`
- `/api/v1/ordens-servico/{id}/anexos`
- `/api/v1/auditoria/**`
- `/api/v1/dashboard/**`

## Testes e comandos executados

```bash
cmd /c mvnw.cmd -q test
cmd /c mvnw.cmd -q -DskipTests package
cmd /c "cd nexusos-web && npm run build"
cmd /c "cd nexusos-web && npm audit --audit-level=moderate"
cmd /c "cd nexusos-web && npm outdated"
cmd /c mvnw.cmd -q dependency:tree
```

## Resultado das verificacoes

- Testes Java: passaram.
- Build backend: passou.
- Build frontend: passou.
- `npm audit`: 2 vulnerabilidades moderadas em `postcss` transitivo do `next`, sem fix automatico disponivel.
- `npm outdated`: ha atualizacoes disponiveis, com destaque para `next` 16.x, `eslint` 10.x, `lucide-react` 1.x, `zod` 4.x e `tailwindcss` 4.x.
- `mvn dependency:tree`: executado com sucesso.

## Checklist OWASP Top 10

- Broken Access Control: parcialmente mitigado com `@PreAuthorize`; pendente escopo por proprietario/cliente.
- Cryptographic Failures: JWT reforcado; pendente cookie HttpOnly para reduzir impacto de XSS.
- Injection: JPA reduz risco de SQLi; manter validacoes e evitar queries concatenadas.
- Insecure Design: fluxo de bootstrap de usuario protegido apos primeiro usuario.
- Security Misconfiguration: headers adicionados; pendente Swagger em producao.
- Vulnerable and Outdated Components: auditoria npm apontou risco moderado transitivo.
- Identification and Authentication Failures: rate limit e JWT reforcados; pendente refresh token revogavel.
- Software and Data Integrity Failures: Flyway preservado; revisar pipeline CI/CD com checks obrigatorios.
- Security Logging and Monitoring Failures: pendente ampliacao de auditoria de eventos de seguranca.
- SSRF: sem integrações externas identificadas no escopo atual; manter bloqueio caso upload/import remoto seja criado.
