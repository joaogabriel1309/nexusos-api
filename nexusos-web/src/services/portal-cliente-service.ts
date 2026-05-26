import { api } from "@/lib/api";
import type { PortalCliente, PortalOrdemServico } from "@/types";

export const portalClienteService = {
  async listarOrdens(token: string) {
    const response = await api.get<PortalCliente>(`/portal/clientes/${token}/ordens-servico`);
    return response.data;
  },

  async aprovar(token: string, ordemServicoId: string, observacao?: string) {
    const response = await api.patch<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/aprovar`,
      { observacao: observacao || null }
    );
    return response.data;
  },

  async reprovar(token: string, ordemServicoId: string, observacao?: string) {
    const response = await api.patch<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/reprovar`,
      { observacao: observacao || null }
    );
    return response.data;
  }
};
