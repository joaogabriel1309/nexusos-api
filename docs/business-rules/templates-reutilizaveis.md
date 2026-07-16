# Templates reutilizaveis de ordem de servico

## Regra de negocio

- Templates sao atalhos de preenchimento e nunca alteram uma ordem de servico sem uma acao explicita do usuario.
- Os tipos disponiveis sao: descricao da OS, analise tecnica, finalizacao e mensagem ao cliente.
- O sistema oferece modelos iniciais para todos os tipos. O usuario pode criar modelos personalizados no proprio seletor.
- Modelos personalizados ficam armazenados no navegador. Eles nao sao enviados para a API nem expostos no portal publico do cliente.
- Ao aplicar um template em um campo que ja possui texto, o novo conteudo e acrescentado ao final para preservar o que foi digitado.
- Somente modelos personalizados podem ser excluidos. Os modelos iniciais permanecem disponiveis.
- Os limites de titulo e conteudo sao validados antes de salvar um modelo personalizado.

Essa abordagem preserva os contratos atuais da API e nao requer alteracao de banco de dados.
