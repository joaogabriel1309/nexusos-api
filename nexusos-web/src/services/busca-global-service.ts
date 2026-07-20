import { api } from "@/lib/api";
import type { BuscaGlobalResultado } from "@/types";

export const buscaGlobalService = {
  async buscar(termo: string) {
    const { data } = await api.get<BuscaGlobalResultado>("/busca-global", { params: { termo } });
    return data;
  }
};
