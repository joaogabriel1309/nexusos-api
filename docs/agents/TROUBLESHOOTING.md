# Troubleshooting

## GitHub CLI nao autenticado

Rode:

```bash
gh auth login
```

Depois retome:

```bash
pnpm agents:resume ID
```

## Existem alteracoes locais antes da branch

Faça commit ou stash das alteracoes antes de iniciar. O sistema nao troca de branch quando houver risco de perda de trabalho.

## Testes falharam

Corrija na branch da tarefa e rode:

```bash
pnpm agents:resume ID
```

## PR duplicado

O sistema consulta PR aberto por branch. Se encontrar um, atualiza em vez de criar outro.
