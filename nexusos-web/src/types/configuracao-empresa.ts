export type ConfiguracaoEmpresa = {
  nome: string;
  logo: string | null;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  corPrincipal: string;
  atualizadoEm: string;
};

export type ConfiguracaoEmpresaPayload = Omit<ConfiguracaoEmpresa, "atualizadoEm">;
