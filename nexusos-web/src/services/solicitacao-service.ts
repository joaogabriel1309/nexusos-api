import { api } from "@/lib/api";
import type {
  MotivoRejeicaoSolicitacao,
  PrioridadeOS,
  SolicitacaoAnexo,
  SolicitacaoDetalhe,
  SolicitacaoResumo
} from "@/types";

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export const solicitacaoService = {
  async listar() {
    return (await api.get<SolicitacaoResumo[]>("/solicitacoes")).data;
  },
  async resumo() {
    return (await api.get<{ pendentes: number }>("/solicitacoes/resumo")).data;
  },
  async buscar(id: string) {
    return (await api.get<SolicitacaoDetalhe>(`/solicitacoes/${id}`)).data;
  },
  async assumir(id: string) {
    return (await api.patch<SolicitacaoDetalhe>(`/solicitacoes/${id}/assumir`)).data;
  },
  async atualizarResponsavel(id: string, responsavelId?: string) {
    return (await api.patch<SolicitacaoDetalhe>(`/solicitacoes/${id}/responsavel`, { responsavelId })).data;
  },
  async solicitarEsclarecimentos(id: string, mensagem: string) {
    return (await api.post<SolicitacaoDetalhe>(`/solicitacoes/${id}/esclarecimentos`, { mensagem })).data;
  },
  async rejeitar(id: string, motivo: MotivoRejeicaoSolicitacao, detalhe: string) {
    return (await api.post<SolicitacaoDetalhe>(`/solicitacoes/${id}/rejeitar`, { motivo, detalhe })).data;
  },
  async converter(id: string, dados: {
    titulo: string;
    descricao: string;
    projetoId?: string;
    responsavelId?: string;
    prioridade?: PrioridadeOS;
    prazo?: string;
  }) {
    return (await api.post<SolicitacaoDetalhe>(`/solicitacoes/${id}/converter`, dados)).data;
  },
  async baixarAnexo(id: string, anexo: SolicitacaoAnexo) {
    const blob = (await api.get<Blob>(`/solicitacoes/${id}/anexos/${anexo.id}/arquivo`, { responseType: "blob" })).data;
    baixarBlob(blob, anexo.nomeArquivo);
  }
};

export const portalSolicitacaoService = {
  async listar(token: string) {
    return (await api.get<SolicitacaoResumo[]>(`/portal/clientes/${token}/solicitacoes`)).data;
  },
  async buscar(token: string, id: string) {
    return (await api.get<SolicitacaoDetalhe>(`/portal/clientes/${token}/solicitacoes/${id}`)).data;
  },
  async criar(token: string, dados: { titulo: string; descricao: string; prioridade?: PrioridadeOS; arquivos: File[] }) {
    const form = new FormData();
    form.append("titulo", dados.titulo);
    form.append("descricao", dados.descricao);
    if (dados.prioridade) form.append("prioridade", dados.prioridade);
    dados.arquivos.forEach((arquivo) => form.append("arquivos", arquivo));
    return (await api.post<SolicitacaoDetalhe>(`/portal/clientes/${token}/solicitacoes`, form, {
      headers: { "Content-Type": "multipart/form-data" }
    })).data;
  },
  async responder(token: string, id: string, mensagem: string, arquivos: File[]) {
    const form = new FormData();
    form.append("mensagem", mensagem);
    arquivos.forEach((arquivo) => form.append("arquivos", arquivo));
    return (await api.post<SolicitacaoDetalhe>(`/portal/clientes/${token}/solicitacoes/${id}/respostas`, form, {
      headers: { "Content-Type": "multipart/form-data" }
    })).data;
  },
  async baixarAnexo(token: string, id: string, anexo: SolicitacaoAnexo) {
    const blob = (await api.get<Blob>(`/portal/clientes/${token}/solicitacoes/${id}/anexos/${anexo.id}/arquivo`, {
      responseType: "blob"
    })).data;
    baixarBlob(blob, anexo.nomeArquivo);
  }
};
