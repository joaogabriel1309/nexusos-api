import { api } from "@/lib/api";
import type { EventoCalendario, PrioridadeOS, StatusOS } from "@/types";

export type CalendarioFiltros = { inicio: string; fim: string; responsavelId?: string; clienteId?: string; projetoId?: string; prioridade?: PrioridadeOS; status?: StatusOS };

export const calendarioService = {
  async listar(filtros: CalendarioFiltros) {
    const { data } = await api.get<EventoCalendario[]>("/calendario", { params: filtros });
    return data;
  }
};
