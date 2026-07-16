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

## Branch alvo

O sistema trabalha direto na branch alvo (`master` por padrao). Force push continua bloqueado.

## Segredos

Runtime e logs sao redigidos para padroes comuns de tokens. Arquivos `.env`, logs, `.agents/runtime`, `target`, `.next` e `node_modules` nao entram no commit automatico.

## Braco programador

O comando programador e bloqueado se nao receber contexto por `{prompt}`, `{promptFile}` ou `{executionFile}`, exceto quando `AGENTS_DEVELOPER_ALLOW_RAW_COMMAND=true`. O orquestrador tambem continua aplicando bloqueio de comandos destrutivos antes da execucao.

## Uploads

Quando uma tarefa envolver upload, o PO inclui criterios obrigatorios: extensao permitida, MIME type, assinatura real, limite de tamanho, quantidade maxima, nome aleatorio, armazenamento seguro, controle de acesso e protecao contra path traversal.
