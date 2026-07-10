import { api } from "@/lib/api";
import type { NotificacaoPagina, NotificacaoResumo } from "@/types";

type ListarHistoricoParams = {
  pagina?: number;
  tamanho?: number;
  lida?: boolean;
  tipo?: string;
};

export const notificacaoService = {
  async listarMinhas() {
    const response = await api.get<NotificacaoResumo>("/notificacoes");
    return response.data;
  },

  async listarHistorico(params: ListarHistoricoParams = {}) {
    const response = await api.get<NotificacaoPagina>("/notificacoes/historico", {
      params
    });
    return response.data;
  },

  async marcarComoLida(id: string) {
    await api.patch(`/notificacoes/${id}/lida`);
  },

  async marcarTodasComoLidas() {
    await api.patch("/notificacoes/marcar-todas-lidas");
  }
};
