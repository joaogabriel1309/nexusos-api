# Preferencias de notificacao

- Administradores e desenvolvedores autenticados podem consultar e alterar somente as proprias preferencias.
- Os tipos configuraveis sao: OS atribuida, prazo vencido, aprovacao do cliente, pagamento, comentarios e alteracoes de status.
- Todas as preferencias ficam habilitadas por padrao. A ausencia de um registro persistido equivale a uma preferencia habilitada.
- Desabilitar uma preferencia impede a criacao de novas notificacoes daquele tipo para o usuario, sem excluir ou alterar o historico existente.
- Eventos internos que nao fazem parte dos seis tipos configuraveis continuam gerando notificacoes normalmente.
- Uma atualizacao deve informar exatamente uma vez cada tipo configuravel; tipos desconhecidos, ausentes ou duplicados sao rejeitados.
