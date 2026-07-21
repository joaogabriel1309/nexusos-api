# Integração com GitHub

Um administrador configura a integração em **Configurações > GitHub**, informando owner/organização, repositório, branch principal e um Fine-grained Personal Access Token. O token deve ter acesso somente ao repositório necessário, com permissões de leitura para **Contents** e **Pull requests**.

O token é criptografado com AES-GCM antes de ser persistido e nunca é devolvido pela API. Defina `GITHUB_ENCRYPTION_KEY` com um segredo de ao menos 32 caracteres em produção. Se o campo de token for deixado vazio ao salvar, o token atual é preservado. Tokens não devem ser incluídos em logs, tickets ou capturas de tela.

Na página da OS, administradores e o desenvolvedor responsável podem informar a branch ou usar a sugestão `os-{codigo}-{titulo-normalizado}`. O botão **Sincronizar GitHub** valida a branch, busca até 100 commits e procura um Pull Request cuja branch de origem seja a vinculada. Quando há PR, também são armazenados número, URL, status e até 100 arquivos alterados. A ausência de PR não impede que os commits sejam salvos.

A sincronização exige uma configuração completa e habilitada. Somente ADMIN pode consultar, alterar ou testar a configuração. ADMIN pode vincular qualquer OS; DESENVOLVEDOR só pode operar uma OS atribuída à sua própria conta. Os dados sincronizados preenchem automaticamente branch, links de commits/PR e arquivos na tela de finalização, sem sobrescrever valores já registrados.
