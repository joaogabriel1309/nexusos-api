# Troubleshooting

## Git nao autenticado

Confira se o remote e a autenticacao estao corretos:

```bash
git remote -v
ssh -T git@github.com
```

Depois retome:

```bash
pnpm agents:resume ID
```

## Existem alteracoes locais antes da branch alvo

Faca commit ou stash das alteracoes antes de iniciar. O sistema nao troca para a branch alvo quando houver risco de perda de trabalho.

## Testes falharam

Corrija na branch alvo e rode:

```bash
pnpm agents:resume ID
```

## Push falhou

Confira se o remote esta autenticado e se a branch alvo aceita push direto.
