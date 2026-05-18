import { api } from "@/lib/api";
import type { Cliente } from "@/types";
import type { ClienteFormData } from "@/schemas/cliente-schema";

type ClienteUpdatePayload = ClienteFormData & {
  ativo: boolean;
};

export const clienteService = {
  async listar() {
    const response = await api.get<Cliente[]>("/clientes");
    return response.data;
  },

  async criar(data: ClienteFormData) {
    const response = await api.post<Cliente>("/clientes", data);
    return response.data;
  },

  async atualizar(id: string, data: ClienteUpdatePayload) {
    const response = await api.put<Cliente>(`/clientes/${id}`, data);
    return response.data;
  },

  async inativar(id: string) {
    await api.delete(`/clientes/${id}`);
  }
};
