# Configuracao de pagamentos

- Somente administradores podem consultar ou alterar as configuracoes de pagamento. O access token do Mercado Pago e cifrado em repouso e nunca e devolvido pela API ou registrado em logs; uma atualizacao sem novo token preserva o valor atual.
- A chave publica pode ser consultada por administradores porque nao e um segredo. A integracao e considerada configurada quando existe um access token salvo ou fornecido pelo ambiente.
- Links de checkout expiram depois do numero de minutos configurado, contado a partir da criacao. O prazo deve ficar entre 5 minutos e 7 dias.
- Quando a cobranca automatica estiver ativa, uma OS cobrada e ainda nao paga que sair de teste segue para `AGUARDANDO_PAGAMENTO`; somente depois pode ser finalizada.
- Quando OS sem cobranca nao forem permitidas, a analise administrativa nao pode desmarcar a cobranca. OS antigas sem cobranca continuam legiveis para preservar o historico.

