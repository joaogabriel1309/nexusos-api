# Configuracao de WhatsApp

- Somente administradores podem alterar a integracao ou disparar uma mensagem de teste. Administradores e desenvolvedores podem consultar o estado, sem acesso ao token/chave armazenado.
- A integracao pode ficar desabilitada com dados incompletos. Para habilita-la, provedor, credencial e numero padrao devem estar preenchidos; a Meta WhatsApp API tambem exige o ID do numero de telefone.
- Uma credencial vazia em uma atualizacao preserva a credencial atual. Credenciais sao cifradas em repouso e nunca retornam pela API nem aparecem em logs.
- O teste usa o numero padrao configurado. Envios automaticos usam o telefone do cliente; no CallMeBot, a chave global configurada substitui a antiga chave por cliente.
- Telefones sao enviados somente com digitos e recebem o codigo de pais padrao quando informados com DDD e numero locais.

