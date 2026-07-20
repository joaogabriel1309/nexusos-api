import axios from "axios";
import type { AuthResponse, AuthUsuario, LoginRequest } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const authApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

export const authService = {
  async login(email: string, senha: string) {
    const payload: LoginRequest = { email, senha };
    const { data } = await authApi.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  async refresh() {
    const { data } = await authApi.post<AuthResponse>("/auth/refresh");
    return data;
  },

  async me() {
    const { data } = await authApi.post<AuthResponse>("/auth/me");
    return data;
  },

  async logout() {
    await authApi.post("/auth/logout").catch(() => undefined);
  },

  async forgotPassword(email: string) {
    await authApi.post("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, novaSenha: string) {
    await authApi.post("/auth/reset-password", { token, novaSenha });
  },

  getUsuarioFromResponse(response: AuthResponse | null) {
    return response?.usuario ?? null satisfies AuthUsuario | null;
  },

  isAuthenticated() {
    return false;
  }
};
