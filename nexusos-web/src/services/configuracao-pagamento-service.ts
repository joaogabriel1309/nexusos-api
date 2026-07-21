import { api } from "@/lib/api";
import type { ConfiguracaoPagamento, ConfiguracaoPagamentoPayload } from "@/types/configuracao-pagamento";

export const configuracaoPagamentoService = {
  async buscar() { return (await api.get<ConfiguracaoPagamento>("/configuracoes/pagamento")).data; },
  async atualizar(payload: ConfiguracaoPagamentoPayload) {
    return (await api.put<ConfiguracaoPagamento>("/configuracoes/pagamento", payload)).data;
  }
};

