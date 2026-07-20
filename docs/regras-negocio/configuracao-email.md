# Configuracao de e-mail

- A configuracao SMTP e unica para toda a instalacao e fica persistida no banco de dados.
- Somente usuarios com perfil `ADMIN` podem consultar, alterar ou testar a configuracao.
- A senha SMTP nunca e devolvida pela API, exibida em logs ou substituida quando a atualizacao nao informa uma nova senha.
- O status `configurado` e verdadeiro apenas quando host, porta, usuario, senha e e-mail remetente estao preenchidos.
- Envios automaticos so ocorrem quando a configuracao esta habilitada e configurada.
- O e-mail de teste usa a configuracao persistida e informa falhas sem expor credenciais.
- A senha e cifrada antes de ser persistida; a chave de cifra e um segredo da instalacao e nao faz parte da configuracao SMTP.
