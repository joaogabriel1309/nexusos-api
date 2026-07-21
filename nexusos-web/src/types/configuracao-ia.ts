export type ConfiguracaoIA = {
  habilitado: boolean; apiUrl: string; modelo: string; temperatura: number; chaveConfigurada: boolean;
};
export type ConfiguracaoIAPayload = Omit<ConfiguracaoIA, "chaveConfigurada"> & { apiKey?: string | null };
