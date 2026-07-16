import type { PrioridadeOS, StatusOS } from "@/types";

export const statusLabels: Record<StatusOS, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADA: "Aprovada",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  EM_TESTE: "Em teste",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada"
};

export const statusBadgeClasses: Record<StatusOS, string> = {
  RECEBIDA: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  EM_ANALISE: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  AGUARDANDO_APROVACAO: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
  APROVADA: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
  EM_DESENVOLVIMENTO: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
  EM_TESTE: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  AGUARDANDO_PAGAMENTO: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  FINALIZADA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  CANCELADA: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
};

export const prioridadeLabels: Record<PrioridadeOS, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica"
};

export const statusOptions = Object.keys(statusLabels) as StatusOS[];
export const prioridadeOptions = Object.keys(prioridadeLabels) as PrioridadeOS[];
