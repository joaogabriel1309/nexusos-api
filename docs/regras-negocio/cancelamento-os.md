# Cancelamento de ordem de serviço

- Somente um usuário com perfil `ADMIN` pode cancelar uma ordem de serviço.
- O cancelamento exige um motivo não vazio, com no máximo 1000 caracteres.
- Uma OS pode ser cancelada em qualquer etapa, exceto quando já estiver `FINALIZADA` ou `CANCELADA`.
- `CANCELADA` é um estado terminal e não participa das transições do fluxo operacional.
- O cancelamento não exclui a OS nem seus dados relacionados.
- A auditoria registra o administrador autenticado, o motivo e a transição do status anterior para `CANCELADA`.

