# Confirmacao de acoes criticas

## Regra de negocio

- Acoes destrutivas ou que removem o acesso operacional a um registro devem exigir confirmacao explicita em um modal da aplicacao.
- O modal deve identificar o registro afetado, nomear a acao e explicar seus principais impactos antes da confirmacao.
- Fechar o modal, pressionar Escape ou escolher cancelar nao pode executar a acao.
- Enquanto a requisicao estiver em andamento, o modal nao pode ser fechado nem reenviar a operacao.
- A autorizacao continua sendo validada pelo backend; a confirmacao visual nao substitui os controles de acesso existentes.

## Acoes abrangidas

- Exclusao definitiva de ordem de servico.
- Inativacao de cliente, projeto ou usuario.

