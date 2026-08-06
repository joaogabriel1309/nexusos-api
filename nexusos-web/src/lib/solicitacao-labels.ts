import type { MotivoRejeicaoSolicitacao, StatusSolicitacao } from "@/types";

export const solicitacaoStatusLabels: Record<StatusSolicitacao, string> = {
  NOVA: "Nova",
  EM_ANALISE: "Em análise",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  REJEITADA: "Rejeitada",
  CONVERTIDA_EM_TICKET: "Convertida em Ticket"
};

export const solicitacaoStatusClienteLabels: Record<StatusSolicitacao, string> = {
  NOVA: "Recebida",
  EM_ANALISE: "Em avaliação",
  AGUARDANDO_CLIENTE: "Precisamos de você",
  REJEITADA: "Encerrada",
  CONVERTIDA_EM_TICKET: "Virou Ticket"
};

export const solicitacaoStatusClasses: Record<StatusSolicitacao, string> = {
  NOVA: "border-sky-200 bg-sky-50 text-sky-700",
  EM_ANALISE: "border-indigo-200 bg-indigo-50 text-indigo-700",
  AGUARDANDO_CLIENTE: "border-amber-200 bg-amber-50 text-amber-800",
  REJEITADA: "border-red-200 bg-red-50 text-red-700",
  CONVERTIDA_EM_TICKET: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export const motivoRejeicaoLabels: Record<MotivoRejeicaoSolicitacao, string> = {
  FORA_ESCOPO: "Fora do escopo",
  FUNCIONALIDADE_EXISTENTE: "Funcionalidade já existente",
  INFORMACOES_INSUFICIENTES: "Informações insuficientes",
  DUPLICADA: "Solicitação duplicada",
  OUTRO: "Outro motivo"
};

export function protocoloSolicitacao(codigo: number) {
  return `SOL-${String(codigo).padStart(6, "0")}`;
}
