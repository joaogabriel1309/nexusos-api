# Analise de OS pelo desenvolvedor

- O desenvolvedor responsavel pode registrar a estimativa de horas enquanto a OS estiver em `EM_ANALISE`.
- Nesse perfil, a analise nao permite consultar ou alterar valor previsto, configuracao de cobranca ou texto tecnico.
- O registro feito pelo desenvolvedor preserva os dados comerciais existentes da OS.
- Somente um administrador pode aprovar o encerramento da analise, avancando a OS de `EM_ANALISE` para `AGUARDANDO_APROVACAO`.
- Enquanto essa aprovacao administrativa nao ocorrer, a acao de avancar permanece indisponivel para o desenvolvedor.

