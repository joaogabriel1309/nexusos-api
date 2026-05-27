import { api } from "@/lib/api";
import type { PagamentoCheckoutResponse, PortalCliente, PortalOrdemServico } from "@/types";

export const portalClienteService = {
  async listarOrdens(token: string) {
    const response = await api.get<PortalCliente>(`/portal/clientes/${token}/ordens-servico`);
    return response.data;
  },

  async aprovar(token: string, ordemServicoId: string) {
    const response = await api.patch<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/aprovar`,
      {}
    );
    return response.data;
  },

  async reprovar(token: string, ordemServicoId: string) {
    const response = await api.patch<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/reprovar`,
      {}
    );
    return response.data;
  },

  async iniciarPagamento(token: string, ordemServicoId: string) {
    const response = await api.post<PagamentoCheckoutResponse>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/pagamento`,
      {}
    );
    return response.data;
  }
};
