# Comprovante de finalizacao da ordem de servico

- O comprovante e gerado sob demanda e representa os dados atuais da OS no momento da emissao.
- O download so e permitido quando a OS estiver com status `FINALIZADA`.
- Administradores podem emitir o comprovante de qualquer OS. Desenvolvedores podem emitir apenas o de uma OS atribuida ao seu usuario.
- O documento identifica a OS, cliente, projeto e responsavel e registra datas, prioridade, prazo, valores, pagamento, demanda original, analise, entrega, aceite do cliente, referencias tecnicas e historico completo de eventos.
- O historico e apresentado em ordem cronologica para preservar a rastreabilidade desde a criacao ate a finalizacao.
- Dados secretos ou tecnicos de autenticacao do cliente nunca fazem parte do documento.
- A resposta usa `application/pdf` e sugere o nome `os-<codigo>-comprovante-finalizacao.pdf`.
