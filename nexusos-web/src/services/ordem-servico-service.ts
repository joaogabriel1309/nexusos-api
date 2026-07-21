import { api } from "@/lib/api";
import type { AnaliseIA, CentralPendencias, OrdemServico, PrioridadeOS, StatusOS } from "@/types";
import type { OrdemServicoAnaliseFormData } from "@/schemas/ordem-servico-analise-schema";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";

type OrdemServicoUpdatePayload = OrdemServicoFormData & {
  entendimento?: string | null;
  impacto?: string | null;
  riscos?: string | null;
  estimativaHoras?: number | null;
};

export type OrdemServicoFinalizacaoPayload = {
  descricao: string;
  commitsFinalizacao?: string | null;
  branchFinalizacao?: string | null;
  arquivosAlteradosFinalizacao?: string | null;
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

  async finalizar(id: string, payload: OrdemServicoFinalizacaoPayload) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/status`, {
      status: "FINALIZADA",
      descricao: payload.descricao,
      commitsFinalizacao: payload.commitsFinalizacao || null,
      branchFinalizacao: payload.branchFinalizacao || null,
      arquivosAlteradosFinalizacao: payload.arquivosAlteradosFinalizacao || null
    });
    return data;
  },

  async reabrir(id: string, motivo: string) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/reabrir`, { motivo });
    return data;
  },

  async analisarComIA(id: string) {
    return (await api.post<AnaliseIA>(`/ordens-servico/${id}/ia/analisar`)).data;
  },

  async listarPendencias() {
    const { data } = await api.get<CentralPendencias>("/ordens-servico/pendencias");
    return data;
  },

  async baixarComprovanteFinalizacao(id: string, codigo: number) {
    const { data } = await api.get<Blob>(`/ordens-servico/${id}/comprovante-finalizacao`, {
      responseType: "blob"
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `os-${codigo}-comprovante-finalizacao.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  async cancelar(id: string, motivo: string) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/cancelar`, { motivo });
    return data;
  },

  async atualizarAnalise(id: string, payload: OrdemServicoAnaliseFormData) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/analise`, {
      entendimento: payload.textoAnalise || null,
      impacto: null,
      riscos: null,
      estimativaHoras: payload.estimativaHoras,
      cobrar: payload.cobrar
    });
    return data;
  },

  async atualizarPagamento(id: string, paga: boolean) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/pagamento`, {
      paga
    });
    return data;
  },

  async atualizarPrioridade(id: string, prioridade: PrioridadeOS) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/prioridade`, { prioridade });
    return data;
  },

  async atualizarSequencia(id: string, posicao: number) {
    const { data } = await api.patch<OrdemServico[]>(`/ordens-servico/${id}/sequencia`, { posicao });
    return data;
  },

  async atualizarVinculos(id: string, ordemServicoIds: string[]) {
    const { data } = await api.put<OrdemServico>(`/ordens-servico/${id}/vinculos`, { ordemServicoIds });
    return data;
  },

  async assumir(id: string) {
    const { data } = await api.patch<OrdemServico>(`/ordens-servico/${id}/assumir`);
    return data;
  },
  async vincularGithub(id:string,branch:string){ return (await api.patch<OrdemServico>(`/ordens-servico/${id}/github`,{branch})).data; },
  async sincronizarGithub(id:string){ return (await api.post<OrdemServico>(`/ordens-servico/${id}/github/sincronizar`)).data; },
  async sugerirBranchGithub(id:string){ return (await api.get<string>(`/ordens-servico/${id}/github/branch-sugerida`)).data; }
};
