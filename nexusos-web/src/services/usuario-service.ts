import { api } from "@/lib/api";
import type { PerfilUsuario, Usuario } from "@/types";

export type CriarUsuarioPayload = {
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
};

export type AtualizarUsuarioPayload = {
  nome: string;
  email: string;
  senha?: string;
  perfil: PerfilUsuario;
  ativo: boolean;
};

type CadastroInicialPayload = {
  nome: string;
  email: string;
  senha: string;
};

export const usuarioService = {
  async listar() {
    const response = await api.get<Usuario[]>("/usuarios");
    return response.data;
  },

  async criar(data: CriarUsuarioPayload) {
    const response = await api.post<Usuario>("/usuarios", data);
    return response.data;
  },

  async criarUsuarioInicial(data: CadastroInicialPayload) {
    const response = await api.post<Usuario>("/usuarios", {
      nome: data.nome,
      email: data.email,
      senha: data.senha,
      perfil: "ADMIN"
    });
    return response.data;
  },

  async atualizar(id: string, data: AtualizarUsuarioPayload) {
    const response = await api.put<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  async inativar(id: string) {
    await api.delete(`/usuarios/${id}`);
  }
};
