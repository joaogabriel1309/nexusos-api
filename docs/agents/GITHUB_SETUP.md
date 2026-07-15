# Configuracao GitHub

## Requisitos

- Remote `origin` apontando para GitHub.
- GitHub CLI instalado.
- Autenticacao via:

```bash
gh auth login
```

Ou em CI/local nao interativo:

```bash
GH_TOKEN=...
```

Nunca salve tokens reais no repositorio.

## Branch de destino

Prioridade:

1. `AGENTS_TARGET_BRANCH`
2. Branch padrao do GitHub
3. `develop`
4. `main`
5. `master`

## Pull Request

O agente verifica PR aberto para a branch com `gh pr list`. Se existir, atualiza o PR. Se nao existir, cria um novo. O merge permanece humano.
