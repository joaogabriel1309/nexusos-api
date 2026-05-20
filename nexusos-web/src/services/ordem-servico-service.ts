import { api } from "@/lib/api";
import type { OrdemServico, StatusOS } from "@/types";
import type { OrdemServicoAnaliseFormData } from "@/schemas/ordem-servico-analise-schema";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";

type OrdemServicoUpdatePayload = OrdemServicoFormData & {
  entendimento?: string | null;
  impacto?: string | null;
  riscos?: string | null;
  estimativaHoras?: number | null;
};

function toRequest(payload: OrdemServicoFormData) {
  return {
    ...payload,
    responsavelId: payload.responsavelId || null,
    projetoId: payload.projetoId || null,
    prazo: payload.prazo || null
  };
}

export const ordemServicoService = {
  async listar() {
    const { data } = await api.get<OrdemServico[]>("/ordens-servico");
    return data;
  },

  async buscarPorId(id: string) {
    const { data } = await api.get<OrdemServico>(`/ordens-servico/${id}`);
    return data;
  },

  async criar(payload: OrdemServicoFormData) {
    const { data } = await api.post<OrdemServico>("/ordens-servico", toRequest(payload));
    return data;
  },

  async atualizar(id: string, payload: OrdemServicoUpdatePayload) {
    const request = {
      ...toRequest(payload),
      entendimento: payload.entendimento || null,
      impacto: payload.impacto || null,
      riscos: payload.riscos || null,
      estimativaHoras: payload.estimativaHoras ?? null
    };

    const { data } = await api.put<OrdemServico>(`/ordens-servico/${id}`, request);
    return data;
  },

  async excluir(id: string) {
    await api.delete(`/ordens-servico/${id}`);
  },

  async atualizarStatus(id: string, status: StatusOS, descricao?: string) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/status`, {
      status,
      descricao: descricao || "Status alterado pelo frontend."
    });
    return data;
  },

  async atualizarAnalise(id: string, payload: OrdemServicoAnaliseFormData) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/analise`, {
      entendimento: payload.entendimento || null,
      impacto: payload.impacto || null,
      riscos: payload.riscos || null,
      estimativaHoras: payload.estimativaHoras
    });
    return data;
  }
};
