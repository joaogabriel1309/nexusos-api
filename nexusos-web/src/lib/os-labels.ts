import type { PrioridadeOS, StatusOS } from "@/types";

export const statusLabels: Record<StatusOS, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em analise",
  APROVADA: "Aprovada",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  EM_TESTES: "Em testes",
  AGUARDANDO_VALIDACAO: "Aguardando validacao",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada"
};

export const prioridadeLabels: Record<PrioridadeOS, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica"
};

export const statusOptions = Object.keys(statusLabels) as StatusOS[];
export const prioridadeOptions = Object.keys(prioridadeLabels) as PrioridadeOS[];
