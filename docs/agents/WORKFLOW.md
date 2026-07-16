# Workflow

1. `pnpm agents:task "descricao"`
2. O orquestrador cria uma execucao `AGT-AAAA-NNNN`.
3. O PO gera a especificacao.
4. O desenvolvedor usa a branch alvo e executa a implementacao automatizada, se configurada.
5. A seguranca revisa as alteracoes.
6. Os testes e builds sao executados.
7. A entrega cria commit e push direto para a branch alvo.
8. O estado final esperado e `WAITING_FOR_HUMAN_REVIEW`.

## Retomada

Use:

```bash
pnpm agents:resume AGT-2026-0001
```

Isso permite continuar apos implementacao manual, falha corrigida, autenticacao Git ajustada ou interrupcao local.

## Braco programador

Antes da etapa de desenvolvimento, o orquestrador grava um prompt tecnico em `.agents/runtime/<ID>/developer-prompt.md`. O comando programador recebe esse contexto por `{prompt}`, `{promptFile}` ou `{executionFile}` e deve deixar as alteracoes no working tree, sem commit/push.
