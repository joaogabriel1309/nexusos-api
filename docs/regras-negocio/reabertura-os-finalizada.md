# Reabertura de ordem de servico finalizada

- Somente administradores podem reabrir uma OS finalizada.
- A reabertura exige um motivo nao vazio, com no maximo 1000 caracteres.
- Ao reabrir, a OS volta para `EM_DESENVOLVIMENTO` para que os ajustes sejam executados no fluxo normal.
- A data e os textos da ultima finalizacao permanecem na OS. Uma nova finalizacao pode atualizar esses campos, enquanto a trilha de auditoria preserva cada finalizacao e reabertura ocorrida.
- A reabertura gera um evento de auditoria proprio, com o administrador autenticado, o motivo e a transicao de `FINALIZADA` para `EM_DESENVOLVIMENTO`.
- Todos os administradores ativos recebem uma notificacao informando a reabertura e seu motivo.

