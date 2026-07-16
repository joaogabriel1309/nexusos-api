import type { PrioridadeOS, StatusOS } from "@/types";

export const statusLabels: Record<StatusOS, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADA: "Aprovada",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  EM_TESTE: "Em teste",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  FINALIZADA: "Finalizada"
};

export const statusBadgeClasses: Record<StatusOS, string> = {
  RECEBIDA: "border-slate-200 bg-slate-50 text-slate-700",
  EM_ANALISE: "border-sky-200 bg-sky-50 text-sky-700",
  AGUARDANDO_APROVACAO: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  APROVADA: "border-violet-200 bg-violet-50 text-violet-700",
  EM_DESENVOLVIMENTO: "border-indigo-200 bg-indigo-50 text-indigo-700",
  EM_TESTE: "border-amber-200 bg-amber-50 text-amber-800",
  AGUARDANDO_PAGAMENTO: "border-orange-200 bg-orange-50 text-orange-700",
  FINALIZADA: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export const prioridadeLabels: Record<PrioridadeOS, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica"
};

export const statusOptions = Object.keys(statusLabels) as StatusOS[];
export const prioridadeOptions = Object.keys(prioridadeLabels) as PrioridadeOS[];
