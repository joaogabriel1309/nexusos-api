# Kanban de ordens de serviço

O Kanban é uma representação visual do mesmo fluxo de status usado pela API. Ele não cria atalhos entre etapas e a listagem tradicional continua disponível.

## Transições permitidas

- Recebida → Em análise
- Em análise → Aguardando aprovação
- Aguardando aprovação → Aprovada ou Em análise
- Aprovada → Em desenvolvimento
- Em desenvolvimento → Em teste
- Em teste → Aguardando pagamento ou Em desenvolvimento
- Aguardando pagamento → Finalizada ou Em desenvolvimento

Ordens finalizadas e canceladas não aceitam transição pelo Kanban. A finalização exige a descrição da entrega e, por isso, o drop abre o formulário de finalização. A reabertura e o cancelamento permanecem nos fluxos específicos existentes.

Administradores podem executar as transições acima. Desenvolvedores veem somente as ordens atribuídas a eles e não podem avançar uma ordem que esteja em análise, pois essa aprovação cabe ao administrador.
