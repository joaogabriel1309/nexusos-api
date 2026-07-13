import { api } from "@/lib/api";
import type { PrioridadeOS, StatusOS } from "@/types";

export type DashboardResumo = {
  totalOs: number;
  osAbertas: number;
  osFinalizadas: number;
  osVencidas: number;
  osVencemHoje: number;
  osSemResponsavel: number;
  osPorPrioridade: Partial<Record<PrioridadeOS, number>>;
  slaPorPrioridade: Partial<Record<PrioridadeOS, number>>;
  tempoMedioFinalizacaoHoras: number;
};

export type Produtividade = {
  totalOs: number;
  osFinalizadas: number;
  percentualFinalizacao: number;
  tempoMedioFinalizacaoHoras: number;
};

export type OsPorStatus = Partial<Record<StatusOS, number>>;

export const dashboardService = {
  async resumo() {
    const response = await api.get<DashboardResumo>("/dashboard/resumo");
    return response.data;
  },

  async osPorStatus() {
    const response = await api.get<OsPorStatus>("/dashboard/os-por-status");
    return response.data;
  },

  async produtividade() {
    const response = await api.get<Produtividade>("/dashboard/produtividade");
    return response.data;
  }
};
