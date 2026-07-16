# Configuracao GitHub

## Requisitos

- Remote `origin` apontando para GitHub.
- Autenticacao Git configurada para push direto. Use SSH ou token HTTPS.

```bash
git remote -v
ssh -T git@github.com
```

Nunca salve tokens reais no repositorio.

## Branch de destino

Prioridade:

1. `AGENTS_TARGET_BRANCH`
2. `master`
3. `main`
4. Branch atual

## Entrega direta

O agente cria commit e executa `git push origin <branch-alvo>`. Pull Request nao e criado nesse modo.
