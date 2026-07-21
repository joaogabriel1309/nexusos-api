# Kanban de ordens de serviço

- O backend é a fonte única das transições de status. Cada representação interna de OS informa os próximos status permitidos e o motivo dos destinos bloqueados.
- As transições continuam seguindo o fluxo `RECEBIDA -> EM_ANALISE -> AGUARDANDO_APROVACAO -> APROVADA -> EM_DESENVOLVIMENTO -> EM_TESTE -> AGUARDANDO_PAGAMENTO -> FINALIZADA`, incluindo os retornos já suportados.
- Quando a configuração exigir análise, uma OS sem análise preenchida não pode ser enviada ao cliente.
- Quando a configuração exigir aprovação administrativa, um desenvolvedor não pode enviar a análise ao cliente; o motivo deve indicar que aguarda aprovação do administrador.
- A permissão HTTP continua sendo validada no backend. Informações de transição servem à interface e não substituem autorização.
- A ordenação visual por prioridade ou prazo não altera dados. Alterações manuais de fila continuam restritas ao administrador.

