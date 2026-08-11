# Auditoria de Seguranca - NexusOS

Data: 2026-08-11

Escopo: backend Spring Boot, frontend Next.js, PostgreSQL/Flyway, uploads locais,
integracoes externas, Docker, GitHub Actions e configuracoes versionadas.

## Conclusao executiva

A auditoria encontrou vulnerabilidades exploraveis de autorizacao, autenticacao,
integridade de webhook e pipeline. As vulnerabilidades confirmadas no codigo foram
corrigidas e cobertas por testes. Nao foi realizado ataque contra a VPS, Cloudflare,
banco de producao ou servicos de terceiros.

O resultado nao prova ausencia de vulnerabilidades. Permanecem riscos operacionais
que dependem de configuracao da VPS e controles que exigem infraestrutura adicional.
Os itens marcados como acao de producao devem ser concluidos antes do deploy.

## Arquitetura e limites de confianca

- Frontend: Next.js 15, React 19, Axios e cookies de autenticacao.
- Backend: Java 21, Spring Boot 3.5, Spring Security, JPA e Flyway.
- Dados: PostgreSQL e arquivos de upload no disco local.
- Identidades internas: `ADMIN` e `DESENVOLVEDOR`.
- Acesso externo: portal do cliente protegido por token opaco na URL.
- Integracoes: Mercado Pago, SMTP, WhatsApp, GitHub e OpenAI.
- Entrega: GitHub Actions por SSH para uma VPS com Docker e Nginx.

Principais ativos: credenciais, sessoes, dados pessoais de clientes, tickets,
anexos, estado de pagamentos, tokens de integracao e acesso de deploy.

Principais fronteiras:

1. Navegador para Next.js/API.
2. Usuario autenticado para recursos administrativos ou tickets atribuidos.
3. Token publico do cliente para dados e acoes daquele cliente.
4. API para PostgreSQL e armazenamento local.
5. API para provedores externos.
6. GitHub Actions para a VPS de producao.

## Achados corrigidos

| ID | Severidade | Achado | Impacto | Correcao |
| --- | --- | --- | --- | --- |
| SEC-01 | Alta | Refresh JWT podia ser aceito como Bearer de acesso, pois os dois tokens nao tinham tipo | Roubo de refresh permitiria acesso direto as APIs | Claims `access`/`refresh` separados e validacao estrita por finalidade |
| SEC-02 | Alta | Auditoria de ticket era consultada por UUID sem validar o responsavel | Desenvolvedor poderia ler historico de ticket de outra pessoa | Consulta agora passa pela regra de visibilidade de `OrdemServicoService` |
| SEC-03 | Alta | Comentarios, apontamentos e status aceitavam `usuarioId` enviado pelo navegador | Falsificacao do autor e corrupcao da trilha de auditoria | Autor sempre e obtido do contexto autenticado |
| SEC-04 | Alta | Webhook do Mercado Pago era publico e sem validacao de assinatura | Requisicoes forjadas e chamadas indevidas ao provedor | Validacao HMAC SHA-256 de `x-signature`, `x-request-id` e `data.id` |
| SEC-05 | Media | CSRF global estava desativado mesmo com autenticacao por cookie | Acao autenticada induzida por origem externa | Filtro de origem exata para metodos mutaveis com cookie de sessao |
| SEC-06 | Media | Rate limit de login era contornavel trocando IP e o mapa nao tinha limite | Brute force distribuido e consumo de memoria | Limite por identidade e origem, chaves em hash, limpeza e teto de 10 mil chaves |
| SEC-07 | Media | Recuperacao de senha e mutacoes do portal nao tinham protecao adequada contra abuso | Flood de e-mail, pagamento, upload e alteracoes publicas | Limites por conta/token e origem, com respostas HTTP 429 |
| SEC-08 | Media | Rotacao de refresh e consumo de reset token admitiam corrida concorrente | Reuso simultaneo de token de uso unico | Locks pessimistas e revogacao de sessoes em reutilizacao detectada |
| SEC-09 | Media | Pipeline aceitava host SSH por descoberta durante o deploy e nao tinha gate | Falha de integridade e deploy de codigo sem validacao | Host key obrigatoria, Actions fixadas por SHA e testes/build antes do deploy |
| SEC-10 | Media | Dependencias web e Spring estavam atrasadas e havia alertas npm | Exposicao a vulnerabilidades conhecidas | Spring Boot 3.5.16, Next 15.5.21 e dependencias corrigidas; `npm audit` zerado |
| SEC-11 | Media | Headers defensivos do frontend eram incompletos | Maior impacto de XSS, framing e vazamento de referencia | CSP, HSTS, `nosniff`, `DENY`, referrer e permissions policy |
| SEC-12 | Media | Contextos Docker podiam incluir `.env`, artefatos e dependencias locais | Vazamento de segredos e imagens maiores | `.dockerignore` dedicado para backend e frontend |
| SEC-13 | Media | PostgreSQL local era publicado em todas as interfaces | Exposicao acidental do banco na rede | Bind alterado para `127.0.0.1` no Compose versionado |
| SEC-14 | Media | Entradas textuais e alguns payloads nao tinham limites consistentes | Abuso de memoria, banco e logs | Limites de tamanho, pagina maxima e resposta 413 para upload excedido |
| SEC-15 | Media | Chamadas GitHub, WhatsApp e Mercado Pago nao tinham timeout explicito | Esgotamento de threads por dependencia lenta | Timeouts de conexao e leitura centralizados |
| SEC-16 | Media | Swagger podia ficar disponivel por configuracao insegura | Exposicao desnecessaria da superficie da API | Desabilitado e negado no perfil `prod` por padrao |
| SEC-17 | Baixa | Credencial legada de WhatsApp por cliente era persistida sem uso e exposta em DTO | Superficie desnecessaria para segredo em texto | Campo removido da API e do frontend; coluna preservada para migracao segura |
| SEC-18 | Baixa | Logs de e-mail e WhatsApp continham destinatarios | Exposicao de dados pessoais em logs | E-mail e telefone removidos das mensagens operacionais |

## Controles adicionais aplicados

- Usuario inativo deixa de autenticar mesmo com JWT ainda dentro da validade.
- JWTs permanecem apenas em cookies `HttpOnly`; teste garante que nao aparecem no JSON.
- Senha exige 8 caracteres, maiuscula, minuscula e numero no backend e frontend.
- Access token padrao reduzido de 60 para 15 minutos; refresh permanece rotativo.
- Token publico malformado e rejeitado antes de consultar o banco.
- Upload valida tamanho, extensao, MIME, assinatura basica, nome e confinamento de path.
- CORS usa origens exatas e credenciais; Swagger fica indisponivel em producao.
- SQL encontrado e parametrizado; SQL nativo existente e estatico.
- Nenhum uso de `eval`, `dangerouslySetInnerHTML`, execucao de comandos ou desserializacao Java foi encontrado.

## Modelo de ameacas resumido

| Ator | Caminho provavel | Controle atual | Risco residual |
| --- | --- | --- | --- |
| Atacante anonimo | Login, reset, portal e webhook | Rate limit, tokens fortes, HMAC, validacao | Ataque distribuido exige rate limit compartilhado |
| Cliente com link vazado | Consulta e mutacoes do portal | Vinculo cliente-ticket e expiracao | Token na URL pode vazar por historico ou logs |
| Desenvolvedor malicioso | UUID de ticket de outro responsavel | Escopo por responsavel em servicos | Novos endpoints devem reutilizar a mesma politica |
| Admin comprometido | Configuracoes, usuarios e integracoes | RBAC e segredos cifrados | Ausencia de MFA e step-up para acoes criticas |
| Arquivo malicioso | Upload no ticket/solicitacao | Allowlist e assinatura basica | Nao existe antivirus ou sandbox de documento |
| Dependencia externa lenta | Pagamento, GitHub, WhatsApp e IA | Timeouts e mensagens controladas | Circuit breaker ainda nao existe |
| Comprometimento de CI | Deploy SSH | Environment, host key fixa, checks | Usuario da VPS pode ainda ter privilegio excessivo |

## Riscos residuais e acoes de producao

### Prioridade imediata

1. Rotacionar credenciais que ja foram expostas fora do repositorio, especialmente
   senha do banco e `JWT_SECRET`. Nao reutilizar os valores atuais.
2. Antes de trocar `JWT_SECRET`, configurar `EMAIL_ENCRYPTION_KEY`,
   `GITHUB_ENCRYPTION_KEY`, `IA_ENCRYPTION_KEY`, `WHATSAPP_ENCRYPTION_KEY` e
   `PAGAMENTO_ENCRYPTION_KEY` com o valor da chave atual. Isso desacopla a cifra
   existente; depois o JWT pode ser rotacionado sem perder as credenciais salvas.
3. Configurar `MERCADO_PAGO_WEBHOOK_SECRET`. Sem ele, o webhook responde 503 por
   seguranca. O segredo deve ser o gerado na configuracao Webhooks da integracao.
4. Configurar o secret GitHub `VPS_SSH_HOST_KEY` com a chave publica verificada da
   VPS. O deploy agora falha de forma segura se esse valor estiver ausente.
5. Fechar as portas publicas 3000, 8080 e 5432. No Compose de producao, publicar
   frontend e API somente em `127.0.0.1`; expor ao publico apenas Nginx 80/443.
6. Ajustar o `.env` de producao para `JWT_ACCESS_EXPIRATION_MINUTES=15`,
   `AUTH_COOKIE_SECURE=true`, `SPRING_PROFILES_ACTIVE=prod`, Swagger desativado e
   CORS limitado aos dominios realmente utilizados.

Esta versao adiciona tipo aos JWTs. Tokens emitidos pela versao anterior deixam de
ser validos; os usuarios precisarao entrar novamente apos o deploy.

### Curto prazo

- Migrar rate limit para Redis/Bucket4j antes de executar mais de uma instancia.
- Armazenar hash do token do portal e trocar a URL longa por sessao curta do portal.
- Adicionar MFA para administradores e confirmacao reforcada para segredos/pagamentos.
- Colocar uploads em quarentena, verificar com ClamAV e migrar para object storage.
- Criar eventos de seguranca estruturados para login, 401/403, rate limit e webhook.
- Usar usuario de deploy sem root, permissao minima e rollback de release.

### Medio prazo

- Remover `'unsafe-inline'` da CSP usando nonce/hash compativel com Next.js.
- Adicionar circuit breaker e metricas para todas as integracoes externas.
- Implantar backup testado, restauracao periodica, TLS do banco e plano de desastre.
- Revisar LGPD da integracao de IA: minimizacao, base legal, retencao e contrato do provedor.
- Adicionar SAST/SCA continuo, secret scanning e alertas de dependencia no GitHub.

## Validacao executada

- Maven: 115 testes, 0 falhas, 0 erros, incluindo contexto Spring e 31 migrations.
- Frontend: `npm run typecheck` aprovado.
- Frontend: `npm run build` aprovado com Next.js 15.5.21.
- Dependencias web: `npm audit --audit-level=moderate` retornou 0 vulnerabilidades.
- Orquestrador: 41 testes aprovados.
- `npm ls` sem dependencias invalidas para Next, Axios, form-data, PostCSS e Sharp.
- Varreduras manuais para autorizacao, SQL dinamico, execucao de comandos, XSS,
  redirects, headers, segredos versionados e chamadas externas.
- `git diff --check` sem erros de whitespace.

O OWASP Dependency-Check do Maven nao foi concluido porque a atualizacao da base NVD
ficou indisponivel/sem API key no ambiente de auditoria. Portanto, o backend nao deve
ser considerado coberto por SCA completo ate esse check rodar no CI com uma NVD API key.

## Limites da auditoria

- Nenhum DAST ou ataque foi executado contra `nexusosapp.com.br` ou a VPS.
- Nginx, firewall Hostinger, Cloudflare, backups, permissao do usuario SSH e o
  `docker-compose.prod.yml` existente apenas na VPS nao foram inspecionados diretamente.
- Nao houve teste de malware real, carga distribuida, caos de infraestrutura ou restore.
- Integracoes externas foram revisadas estaticamente; credenciais reais nao foram usadas.

Uma nova auditoria deve ser feita apos concluir as acoes de producao e sempre que forem
adicionados novos endpoints publicos, perfis, provedores de pagamento ou upload remoto.
