import { api } from "@/lib/api";
import type { ConfiguracaoIA, ConfiguracaoIAPayload } from "@/types/configuracao-ia";
export const configuracaoIAService = {
  async buscar() { return (await api.get<ConfiguracaoIA>("/configuracoes/ia")).data; },
  async atualizar(payload: ConfiguracaoIAPayload) { return (await api.put<ConfiguracaoIA>("/configuracoes/ia", payload)).data; }
};
