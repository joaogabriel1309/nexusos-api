import { api } from "@/lib/api";
import type { ConfiguracaoOS, ConfiguracaoOSPayload } from "@/types/configuracao-os";

export const configuracaoOSService = {
  async buscar() { return (await api.get<ConfiguracaoOS>("/configuracoes/os")).data; },
  async atualizar(payload: ConfiguracaoOSPayload) { return (await api.put<ConfiguracaoOS>("/configuracoes/os", payload)).data; }
};
