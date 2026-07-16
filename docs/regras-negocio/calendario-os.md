# Calendario de ordens de servico

## Objetivo

O calendario consolida datas relevantes das ordens de servico sem manter uma agenda paralela. Os eventos sao derivados dos dados da OS e, por isso, refletem imediatamente alteracoes de prazo, status, pagamento, responsavel, cliente ou projeto.

## Eventos

- Uma OS com prazo no intervalo consultado gera um evento nessa data.
- O prazo de uma OS aguardando pagamento, cobrada e ainda nao paga e exibido como `VENCIMENTO`.
- O prazo de uma OS aprovada, em desenvolvimento ou em teste e exibido como `ENTREGA_PREVISTA`.
- Os demais prazos sao exibidos como `PRAZO_OS`.
- A finalizacao de uma OS gera um `EVENTO_IMPORTANTE` na data de `finalizadoEm`.
- Uma OS pode, portanto, ter um evento de prazo e um evento de finalizacao quando as datas estiverem no intervalo.

## Consulta e filtros

- O intervalo e inclusivo e limitado a 366 dias para impedir consultas excessivas.
- Sao aceitos filtros opcionais por responsavel, cliente, projeto, prioridade e status.
- Filtros sao combinados com a regra `E`.
- Administradores visualizam todas as OS que atendem aos filtros.
- Desenvolvedores visualizam somente eventos das OS atribuidas ao proprio usuario, mesmo que tentem informar outro responsavel.
- OS sem data aplicavel nao geram evento.

