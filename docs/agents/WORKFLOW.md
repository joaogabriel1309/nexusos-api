# Workflow

1. `pnpm agents:task "descricao"`
2. O orquestrador cria uma execucao `AGT-AAAA-NNNN`.
3. O PO gera a especificacao.
4. O desenvolvedor cria a branch e executa a implementacao automatizada, se configurada.
5. A seguranca revisa as alteracoes.
6. Os testes e builds sao executados.
7. A entrega cria commit, push e Pull Request.
8. O estado final esperado e `WAITING_FOR_HUMAN_REVIEW`.

## Retomada

Use:

```bash
pnpm agents:resume AGT-2026-0001
```

Isso permite continuar apos implementacao manual, falha corrigida, login no GitHub CLI ou interrupcao local.
