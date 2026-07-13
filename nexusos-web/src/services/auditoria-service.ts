import { api } from "@/lib/api";
import type { AuditoriaOS } from "@/types";

export const auditoriaService = {
  async listarPorOrdemServico(ordemServicoId: string) {
    const response = await api.get<AuditoriaOS[]>(`/auditoria/ordens-servico/${ordemServicoId}`);
    return response.data;
  }
};
