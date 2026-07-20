# Workflow

1. `pnpm agents:task "descricao"`
2. O orquestrador cria uma execucao `AGT-AAAA-NNNN`.
3. O PO gera a especificacao.
4. O desenvolvedor usa a branch alvo e executa a implementacao automatizada, se configurada.
5. A seguranca revisa as alteracoes.
6. O agente de Banco de Dados revisa migrations, entidades, repositories, queries e configuracoes de persistencia.
7. O agente de Regras de Negocio revisa fluxo de OS, permissoes, auditoria, notificacoes e exposicao de dados.
8. O agente de Produto revisa valor, caminho de acao, estados e coerencia operacional.
9. O agente de UX revisa experiencia, clareza e responsividade quando houver frontend.
10. O agente de Acessibilidade revisa navegacao por teclado, nomes acessiveis, rotulos, imagens e foco.
11. O agente de Performance revisa consultas, listas, imagens, cache, timers e pontos de gargalo.
12. Os testes e builds sao executados.
13. O agente de Deploy/Producao revisa riscos de publicacao, variaveis, Docker, Compose, proxy e exposicao de servicos.
14. O agente de QA Manual prepara checklist de validacao humana por modulo afetado.
15. O agente de Documentacao revisa se docs, exemplos e guias foram atualizados quando necessario.
16. A entrega cria commit e push direto para a branch alvo.
17. O estado final esperado e `COMPLETED`.

Se uma revisao reprovar e `AGENTS_DEVELOPER_PROVIDER` ou `AGENTS_DEVELOPER_COMMAND` estiver configurado, o fluxo volta automaticamente para o braco programador com os achados da revisao no prompt. Se nao houver braco programador configurado, a execucao permanece em `WAITING_FOR_DEVELOPMENT` para correcao manual e retomada com `pnpm agents:resume`.

## Retomada

Use:

```bash
pnpm agents:resume AGT-2026-0001
```

Isso permite continuar apos implementacao manual, falha corrigida, autenticacao Git ajustada ou interrupcao local.

## Braco programador

Antes da etapa de desenvolvimento, o orquestrador grava um prompt tecnico em `.agents/runtime/<ID>/developer-prompt.md`. O comando programador recebe esse contexto por `{prompt}`, `{promptFile}` ou `{executionFile}` e deve deixar as alteracoes no working tree, sem commit/push.
