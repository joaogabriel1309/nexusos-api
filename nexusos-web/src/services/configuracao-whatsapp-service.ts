import { api } from "@/lib/api";
import type { ConfiguracaoWhatsapp, ConfiguracaoWhatsappPayload } from "@/types/configuracao-whatsapp";

export const configuracaoWhatsappService = {
  async buscar() {
    const { data } = await api.get<ConfiguracaoWhatsapp>("/configuracoes/whatsapp");
    return data;
  },
  async atualizar(payload: ConfiguracaoWhatsappPayload) {
    const { data } = await api.put<ConfiguracaoWhatsapp>("/configuracoes/whatsapp", payload);
    return data;
  },
  async testar() {
    await api.post("/configuracoes/whatsapp/teste");
  }
};

