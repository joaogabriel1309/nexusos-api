# Deploy automatico em producao

O workflow `.github/workflows/deploy.yml` executa o deploy na VPS a cada `push` na branch `master`. Ele acessa `/opt/nexusos-api`, sincroniza o diretorio com `origin/master`, recria os containers e remove somente imagens Docker que nao estao em uso.

## Pre-requisitos na VPS

- Ubuntu com Git, Docker Engine e o plugin Docker Compose (`docker compose`) instalados.
- Repositorio clonado em `/opt/nexusos-api` e com o remoto `origin` configurado.
- Arquivo versionado `/opt/nexusos-api/docker-compose.prod.yml` com a composicao de producao.
- Usuario do deploy com permissao de leitura e escrita no repositorio e permissao para executar Docker.
- Variaveis e arquivos de configuracao de producao ja instalados na VPS, fora do Git quando contiverem segredos.
- Acesso do repositorio na VPS ao GitHub, inclusive quando ele for privado.

O deploy executa `git reset --hard origin/master`. Portanto, alteracoes locais dentro de `/opt/nexusos-api` serao descartadas. Configuracoes e dados persistentes nao devem depender de arquivos locais nao versionados que possam ser removidos por esse processo.

## Secrets no GitHub

Em **Settings > Secrets and variables > Actions > New repository secret**, crie:

| Secret | Conteudo |
| --- | --- |
| `VPS_HOST` | Hostname ou endereco IP da VPS |
| `VPS_USER` | Usuario Linux usado no deploy |
| `VPS_SSH_KEY` | Conteudo completo da chave privada que autentica o GitHub Actions na VPS |
| `VPS_PORT` | Porta do servidor SSH, normalmente `22` |

O job usa o environment `production`. Se os secrets forem cadastrados como environment secrets, crie o environment **production** em **Settings > Environments** e cadastre os mesmos quatro nomes nele.

Nunca salve a chave privada, senhas, tokens, IPs ou o arquivo `.env` no repositorio.

## Gerar a chave para o GitHub Actions acessar a VPS

Em uma maquina administrativa, gere um par exclusivo e sem passphrase, pois o workflow nao e interativo:

```bash
ssh-keygen -t ed25519 -C "github-actions-nexusos" -f ./nexusos_deploy
```

Instale `nexusos_deploy.pub` na conta de deploy da VPS:

```bash
ssh-copy-id -i ./nexusos_deploy.pub -p 22 usuario@host-da-vps
```

Como alternativa, acrescente o conteudo da chave publica a `~/.ssh/authorized_keys` na VPS, mantendo `~/.ssh` com permissao `700` e `authorized_keys` com permissao `600`. Copie o conteudo completo de `nexusos_deploy` para o secret `VPS_SSH_KEY` e depois remova com seguranca a copia privada da maquina administrativa se ela nao precisar ser mantida.

Essa chave serve apenas para o Actions entrar na VPS. Para um repositorio privado, a VPS precisa de outra credencial para executar `git fetch`. A opcao recomendada e uma deploy key somente leitura: gere outro par na VPS, adicione a chave publica em **Settings > Deploy keys** do repositorio GitHub e configure o remoto `origin` via SSH (`git@github.com:organizacao/repositorio.git`). Nao reutilize a chave privada do Actions para esse fim.

## Testar antes do primeiro deploy

Teste a mesma chave e porta a partir de uma maquina autorizada:

```bash
ssh -i ./nexusos_deploy -p 22 usuario@host-da-vps
```

Na VPS, valide todos os pre-requisitos sem iniciar o workflow:

```bash
cd /opt/nexusos-api
git fetch origin master
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml ps
```

No primeiro contato, confira a fingerprint apresentada pelo SSH com a fingerprint do servidor obtida por um canal confiavel. O workflow registra a chave publica apresentada pelo host durante a execucao; por isso, proteja o environment `production` com as regras de aprovacao adequadas ao repositorio.

## Disparar e acompanhar um deploy

O unico gatilho e um `push` para `master`, inclusive um merge que gere push nessa branch:

```bash
git push origin master
```

Abra a aba **Actions** do repositorio e selecione **Deploy de producao**. O job falha imediatamente quando faltar algum secret, a conexao SSH falhar, o codigo nao puder ser atualizado, o Compose for invalido ou os containers nao puderem subir. Execucoes simultaneas ficam em fila para impedir dois deploys concorrentes.

## Consultar status e logs na VPS

```bash
cd /opt/nexusos-api
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200
docker compose -f docker-compose.prod.yml logs -f
```

Use `Ctrl+C` para sair do acompanhamento continuo de logs. O workflow tambem mostra `docker ps` e as ultimas 50 linhas dos logs ao final de cada deploy.

## Rollback manual

Identifique primeiro um commit conhecido e valido no historico. Em seguida, na VPS, substitua `<commit>` pelo SHA escolhido:

```bash
cd /opt/nexusos-api
git fetch origin master
git reset --hard <commit>
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100
```

Esse rollback e temporario: o proximo push em `master` voltara a VPS para `origin/master`. Para torna-lo permanente, reverta o commit problemático no GitHub e envie o novo commit de reversao para `master`. O rollback de codigo nao reverte automaticamente migracoes de banco de dados nem dados persistidos; esses casos exigem um procedimento especifico e backup validado.
