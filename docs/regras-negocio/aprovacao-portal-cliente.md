# Aprovacao de OS no Portal do Cliente

- Somente a OS pertencente ao cliente identificado pelo token do portal pode ser consultada ou alterada.
- A decisao do cliente so pode ser registrada quando a OS estiver em `AGUARDANDO_APROVACAO`.
- Ao aprovar, a OS segue para `APROVADA`; uma observacao e opcional.
- Ao solicitar ajuste, o cliente deve informar um motivo com texto nao vazio. A OS retorna para `EM_ANALISE` e o motivo e armazenado como observacao da decisao.
- Depois de registrada, a decisao deixa de estar disponivel no portal ate que a OS volte a aguardar aprovacao.

## Linguagem e orientacao ao cliente

- O portal preserva os estados internos da OS, mas os apresenta em linguagem voltada ao cliente, acompanhados do que esta acontecendo e do proximo passo esperado.
- Termos operacionais internos, como analise, desenvolvimento e teste, sao agrupados como etapas do atendimento ou da execucao.
- Quando a OS aguarda aprovacao, o portal destaca que o cliente precisa revisar a proposta e escolher entre autorizar o inicio do trabalho ou pedir alteracoes.
- Quando existe valor pendente e o pagamento esta disponivel, o portal destaca o pagamento como proxima acao do cliente.
- Informacoes de prioridade e nomes internos de campos nao sao exibidos no detalhe compartilhado; o conteudo e organizado como pedido, proposta da equipe, entrega e valores.
- Acoes e mensagens devem informar o resultado para o cliente sem expor nomes de integracoes, estados tecnicos ou rotinas internas.

