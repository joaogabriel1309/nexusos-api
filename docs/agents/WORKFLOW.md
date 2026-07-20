# Workflow

1. `pnpm agents:task "descricao"`
2. O orquestrador cria uma execucao `AGT-AAAA-NNNN`.
3. O PO gera a especificacao.
4. O desenvolvedor usa a branch alvo e executa a implementacao automatizada, se configurada.
5. A seguranca revisa as alteracoes.
6. O agente de Banco de Dados revisa migrations, entidades, repositories, queries e configuracoes de persistencia.
7. O agente de Regras de Negocio revisa fluxo de OS, permissoes, auditoria, notificacoes e exposicao de dados.
8. O agente de UX revisa experiencia, clareza e responsividade quando houver frontend.
9. Os testes e builds sao executados.
10. O agente de Deploy/Producao revisa riscos de publicacao, variaveis, Docker, Compose, proxy e exposicao de servicos.
11. O agente de QA Manual prepara checklist de validacao humana por modulo afetado.
12. A entrega cria commit e push direto para a branch alvo.
13. O estado final esperado e `COMPLETED`.

## Retomada

Use:

```bash
pnpm agents:resume AGT-2026-0001
```

Isso permite continuar apos implementacao manual, falha corrigida, autenticacao Git ajustada ou interrupcao local.

## Braco programador

Antes da etapa de desenvolvimento, o orquestrador grava um prompt tecnico em `.agents/runtime/<ID>/developer-prompt.md`. O comando programador recebe esse contexto por `{prompt}`, `{promptFile}` ou `{executionFile}` e deve deixar as alteracoes no working tree, sem commit/push.
