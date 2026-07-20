import { api } from "@/lib/api";
import type { ConfiguracaoEmpresa, ConfiguracaoEmpresaPayload } from "@/types/configuracao-empresa";

export const configuracaoEmpresaService = {
  async buscar() {
    const { data } = await api.get<ConfiguracaoEmpresa>("/configuracoes/empresa");
    return data;
  },
  async atualizar(payload: ConfiguracaoEmpresaPayload) {
    const { data } = await api.put<ConfiguracaoEmpresa>("/configuracoes/empresa", payload);
    return data;
  }
};
