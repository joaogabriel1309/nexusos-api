import axios from "axios";
import type { AuthResponse, LoginRequest } from "@/types/auth";

const TOKEN_KEY = "nexusos.accessToken";
const REFRESH_TOKEN_KEY = "nexusos.refreshToken";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export const authService = {
  async login(email: string, senha: string) {
    const payload: LoginRequest = { email, senha };
    const { data } = await axios.post<AuthResponse>(`${API_URL}/auth/login`, payload);
    this.setToken(data.accessToken);

    if (canUseStorage() && data.refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }

    return data;
  },

  logout() {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getToken() {
    if (!canUseStorage()) {
      return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    if (canUseStorage()) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  }
};
