import type { Notificacao } from "@/types";

const notificacaoTipoLabels: Record<string, string> = {
  ATRIBUICAO: "Atribuicao",
  STATUS: "Status",
  PRAZO_PROXIMO: "Prazo próximo",
  PRAZO_VENCIDO: "Prazo vencido",
  APROVACAO_CLIENTE: "Aprovacao do cliente",
  PAGAMENTO: "Pagamento",
  OS_SEM_RESPONSAVEL: "OS sem responsável",
  OS_SEM_PRAZO: "OS sem prazo",
  OS_CRITICA: "OS critica",
  OS_PARADA: "OS parada",
  RESPONSAVEL_ALTERADO: "Responsável alterado",
  COMENTARIO: "Comentario",
  CHECKLIST: "Checklist",
  ANEXO: "Anexo",
  PRIORIDADE: "Prioridade",
  PRAZO_ALTERADO: "Prazo alterado",
  APONTAMENTO: "Apontamento",
  INTEGRACAO_FALHA: "Falha de integracao",
  USUARIO: "Usuário",
  CLIENTE: "Cliente",
  PROJETO: "Projeto"
};

export function getNotificacaoTipoLabel(tipo: string) {
  return notificacaoTipoLabels[tipo] ?? tipo.replaceAll("_", " ");
}

export function getNotificacaoTipoVariant(tipo: string): "default" | "warning" | "danger" | "success" | "secondary" {
  switch (tipo) {
    case "PRAZO_VENCIDO":
    case "OS_CRITICA":
    case "INTEGRACAO_FALHA":
      return "danger";
    case "PRAZO_PROXIMO":
    case "OS_SEM_RESPONSAVEL":
    case "OS_SEM_PRAZO":
    case "OS_PARADA":
      return "warning";
    case "PAGAMENTO":
      return "success";
    case "STATUS":
    case "COMENTARIO":
    case "CHECKLIST":
    case "ANEXO":
    case "APONTAMENTO":
      return "secondary";
    default:
      return "default";
  }
}

export function getResumoNotificacao(notificacao: Notificacao) {
  const osPrefixo = notificacao.ordemServicoCodigo ? `OS ${notificacao.ordemServicoCodigo} • ` : "";
  return `${osPrefixo}${getNotificacaoTipoLabel(notificacao.tipo)}`;
}
