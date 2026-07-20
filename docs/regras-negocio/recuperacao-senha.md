# Recuperacao de senha

## Regra de negocio

- A solicitacao de recuperacao sempre retorna a mesma resposta, exista ou nao um usuario ativo com o e-mail informado, evitando enumeracao de contas.
- Somente usuarios ativos recebem a mensagem de recuperacao.
- O token e aleatorio, de uso unico e valido por 60 minutos. Apenas seu hash e persistido.
- Uma nova solicitacao invalida tokens de recuperacao anteriores ainda ativos do mesmo usuario.
- A nova senha deve ter no minimo 8 caracteres, incluindo letra maiuscula, letra minuscula e numero.
- Ao concluir a redefinicao, todos os tokens de recuperacao e todas as sessoes (refresh tokens) do usuario sao revogados.
- Tokens inexistentes, expirados ou ja utilizados sao rejeitados com a mesma resposta, sem revelar seu estado.
- Tokens, senhas e hashes nao devem ser registrados em logs.

## Fluxo

1. O usuario informa o e-mail na tela de recuperacao.
2. A API responde de forma neutra e, quando a conta esta ativa, envia um link para `/redefinir-senha?token=...`.
3. O usuario informa e confirma a nova senha.
4. A API consome o token, troca a senha e encerra as sessoes existentes.
5. O usuario retorna ao login e autentica com a nova senha.
