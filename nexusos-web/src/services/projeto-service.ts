import { api } from "@/lib/api";
import type { Projeto } from "@/types";
import type { ProjetoFormData } from "@/schemas/projeto-schema";

type ProjetoUpdatePayload = ProjetoFormData & {
  ativo: boolean;
};

export const projetoService = {
  async listar() {
    const response = await api.get<Projeto[]>("/projetos");
    return response.data;
  },

  async criar(data: ProjetoFormData) {
    const response = await api.post<Projeto>("/projetos", data);
    return response.data;
  },

  async atualizar(id: string, data: ProjetoUpdatePayload) {
    const response = await api.put<Projeto>(`/projetos/${id}`, data);
    return response.data;
  },

  async inativar(id: string) {
    await api.delete(`/projetos/${id}`);
  }
};
