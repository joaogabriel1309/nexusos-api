import { api } from "@/lib/api";
import type { Anexo, PagamentoCheckoutResponse, PagamentoPixResponse, PortalCliente, PortalOrdemServico } from "@/types";

export const portalClienteService = {
  async listarAnexos(token: string, ordemId: string) {
    return (await api.get<Anexo[]>(`/portal/clientes/${token}/ordens-servico/${ordemId}/anexos`)).data;
  },
  async enviarAnexo(token: string, ordemId: string, arquivo: File, descricao?: string) {
    const form = new FormData();
    form.append("arquivo", arquivo);
    if (descricao) form.append("descricao", descricao);
    return (await api.post<Anexo>(`/portal/clientes/${token}/ordens-servico/${ordemId}/anexos`, form)).data;
  },
  async baixarAnexo(token: string, ordemId: string, anexo: Anexo) {
    const blob = (await api.get<Blob>(`/portal/clientes/${token}/ordens-servico/${ordemId}/anexos/${anexo.id}/arquivo`, { responseType: "blob" })).data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = anexo.nomeArquivo; link.click();
    URL.revokeObjectURL(url);
  },
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

  async reprovar(token: string, ordemServicoId: string, motivo: string) {
    const response = await api.patch<PortalOrdemServico>(
      `/portal/clientes/${token}/ordens-servico/${ordemServicoId}/reprovar`,
      { observacao: motivo }
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
