# Central de Pendencias

## Regras de negocio

- A central e restrita ao perfil `ADMIN`, pois consolida ordens de todos os clientes e responsaveis.
- Ordens `FINALIZADA` ou `CANCELADA` nao entram nas categorias de prazo ou de atribuicao.
- Uma ordem pode aparecer em mais de uma categoria quando exige mais de uma acao.
- `Vencidas`: ordem ativa com prazo anterior a data atual.
- `Vencem hoje`: ordem ativa com prazo igual a data atual.
- `Sem responsavel`: ordem ativa sem usuario responsavel.
- `Aguardando aprovacao do admin`: ordem com status `RECEBIDA`, ainda aguardando triagem administrativa.
- `Aguardando cliente`: ordem com status `AGUARDANDO_APROVACAO`.
- `Aguardando pagamento`: ordem com status `AGUARDANDO_PAGAMENTO` e ainda nao paga.
- `Reprovadas pelo cliente`: ordem cujo ultimo registro de decisao do cliente e `aprovadaPeloCliente = false`.

As listas sao ordenadas por prazo (quando houver) e, em seguida, pelo codigo da OS. O mesmo contrato resumido de ordem de servico e reutilizado para preservar os campos e links existentes.
