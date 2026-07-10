import { api } from "@/lib/api";
import type { NotificacaoResumo } from "@/types";

export const notificacaoService = {
  async listarMinhas() {
    const response = await api.get<NotificacaoResumo>("/notificacoes");
    return response.data;
  },

  async marcarComoLida(id: string) {
    await api.patch(`/notificacoes/${id}/lida`);
  },

  async marcarTodasComoLidas() {
    await api.patch("/notificacoes/marcar-todas-lidas");
  }
};
