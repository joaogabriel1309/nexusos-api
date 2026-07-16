import { api } from "@/lib/api";
import type { NotificacaoPagina, NotificacaoResumo, PreferenciasNotificacao } from "@/types";

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
  },

  async consultarPreferencias() {
    const response = await api.get<PreferenciasNotificacao>("/notificacoes/preferencias");
    return response.data;
  },

  async atualizarPreferencias(preferencias: PreferenciasNotificacao) {
    const response = await api.put<PreferenciasNotificacao>("/notificacoes/preferencias", preferencias);
    return response.data;
  }
};
