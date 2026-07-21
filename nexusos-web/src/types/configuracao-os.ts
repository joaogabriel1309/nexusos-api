import type { PrioridadeOS, StatusOS } from "@/types";

export type ConfiguracaoOS = {
  prazoBaixaDias: number;
  prazoMediaDias: number;
  prazoAltaDias: number;
  prazoCriticaDias: number;
  prioridadePadrao: PrioridadeOS;
  responsavelPadraoId: string | null;
  responsavelPadraoNome: string | null;
  permitirSemResponsavel: boolean;
  statusInicial: StatusOS;
  exigirAnaliseAntesCliente: boolean;
  exigirAprovacaoAdminAntesCliente: boolean;
  atualizadoEm: string;
};

export type ConfiguracaoOSPayload = Omit<ConfiguracaoOS, "responsavelPadraoNome" | "atualizadoEm">;
