import { api } from "@/lib/api";
import type { PagamentoCheckoutResponse, PagamentoPixResponse, PortalCliente, PortalOrdemServico } from "@/types";

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
  },

  async gerarPix(token: string, ordemServicoId: string) {
    const response = await api.post<PagamentoPixResponse>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/pagamento/pix`,
      {}
    );
    return response.data;
  },

  async confirmarPagamento(token: string, ordemServicoId: string, paymentId: string) {
    const response = await api.post<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/pagamento/confirmar`,
      { paymentId }
    );
    return response.data;
  },

  async verificarPagamento(token: string, ordemServicoId: string) {
    const response = await api.post<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/pagamento/verificar`,
      {}
    );
    return response.data;
  }
};
