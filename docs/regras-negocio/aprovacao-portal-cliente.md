# Aprovacao de OS no Portal do Cliente

- Somente a OS pertencente ao cliente identificado pelo token do portal pode ser consultada ou alterada.
- A decisao do cliente so pode ser registrada quando a OS estiver em `AGUARDANDO_APROVACAO`.
- Ao aprovar, a OS segue para `APROVADA`; uma observacao e opcional.
- Ao solicitar ajuste, o cliente deve informar um motivo com texto nao vazio. A OS retorna para `EM_ANALISE` e o motivo e armazenado como observacao da decisao.
- Depois de registrada, a decisao deixa de estar disponivel no portal ate que a OS volte a aguardar aprovacao.

