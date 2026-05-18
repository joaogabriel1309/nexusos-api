import { api } from "@/lib/api";
import type { CadastroInicialRequest, Usuario } from "@/types";
import type { CadastroInicialFormData } from "@/schemas/auth-schema";

export const usuarioService = {
  async criarUsuarioInicial(data: CadastroInicialFormData) {
    const payload: CadastroInicialRequest = {
      nome: data.nome,
      email: data.email,
      senha: data.senha,
      perfil: "ADMIN"
    };

    const response = await api.post<Usuario>("/usuarios", payload);
    return response.data;
  }
};
