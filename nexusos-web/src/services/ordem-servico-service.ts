import { api } from "@/lib/api";
import type { OrdemServico } from "@/types";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";

export const ordemServicoService = {
  async criar(payload: OrdemServicoFormData) {
    const request = {
      ...payload,
      responsavelId: payload.responsavelId || null,
      prazo: payload.prazo || null,
      estimativaHoras: payload.estimativaHoras ?? null
    };

    const { data } = await api.post<OrdemServico>("/ordens-servico", request);
    return data;
  }
};
