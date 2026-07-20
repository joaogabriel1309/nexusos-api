import { api } from "@/lib/api";
import type { ConfiguracaoEmail, ConfiguracaoEmailPayload } from "@/types/configuracao-email";

export const configuracaoEmailService = {
  async buscar() {
    const { data } = await api.get<ConfiguracaoEmail>("/configuracoes/email");
    return data;
  },
  async atualizar(payload: ConfiguracaoEmailPayload) {
    const { data } = await api.put<ConfiguracaoEmail>("/configuracoes/email", payload);
    return data;
  },
  async testar(destinatario: string) {
    await api.post("/configuracoes/email/teste", { destinatario });
  }
};
