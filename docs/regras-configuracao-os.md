# Regras de configuracao de ordens de servico

- Na criacao de uma OS, prioridade, responsavel e prazo informados explicitamente prevalecem sobre os valores padrao.
- Quando a prioridade nao for informada, a prioridade padrao configurada e aplicada.
- Quando o prazo nao for informado, ele e calculado a partir da data atual e do numero de dias configurado para a prioridade efetiva.
- Quando o responsavel nao for informado, o responsavel padrao ativo e aplicado. Sem responsavel padrao, a criacao so e permitida se `permitir OS sem responsavel` estiver habilitado.
- O status inicial configurado e aplicado somente na criacao. Ordens existentes nao sao alteradas ao salvar a configuracao.
- Se `exigir analise antes de enviar ao cliente` estiver habilitado, a transicao para `AGUARDANDO_APROVACAO` exige entendimento, impacto, riscos e estimativa de horas preenchidos.
- Se `exigir aprovacao admin antes do cliente` estiver habilitado, somente ADMIN pode fazer a transicao de `EM_ANALISE` para `AGUARDANDO_APROVACAO`. Quando desabilitado, o desenvolvedor responsavel pode realizar a transicao.
- Apenas ADMIN pode consultar e alterar as configuracoes de OS.
