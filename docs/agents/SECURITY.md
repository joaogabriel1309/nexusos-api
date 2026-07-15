# Seguranca dos agentes

## Comandos bloqueados

- `rm -rf`
- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `git push -f`
- `git branch -D`
- `DROP DATABASE`
- `DROP TABLE`

## Branches protegidas

O sistema bloqueia push direto para `main`, `master`, `develop`, `production` e `release`.

## Segredos

Runtime e logs sao redigidos para padroes comuns de tokens. Arquivos `.env`, logs, `.agents/runtime`, `target`, `.next` e `node_modules` nao entram no commit automatico.

## Uploads

Quando uma tarefa envolver upload, o PO inclui criterios obrigatorios: extensao permitida, MIME type, assinatura real, limite de tamanho, quantidade maxima, nome aleatorio, armazenamento seguro, controle de acesso e protecao contra path traversal.
