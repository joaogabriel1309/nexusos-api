export type ConfiguracaoGithub = { habilitado: boolean; owner: string | null; repositorio: string | null; branchPrincipal: string | null; configurado: boolean; tokenConfigurado: boolean; atualizadoEm: string };
export type ConfiguracaoGithubPayload = { habilitado: boolean; owner: string | null; repositorio: string | null; token: string | null; branchPrincipal: string | null };
