import axios from "axios";
import type { AuthResponse, AuthUsuario, LoginRequest } from "@/types/auth";

const TOKEN_KEY = "nexusos.accessToken";
const REFRESH_TOKEN_KEY = "nexusos.refreshToken";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function parseJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = window.atob(base64);
    return JSON.parse(json) as { sub?: string; perfil?: AuthUsuario["perfil"] };
  } catch {
    return null;
  }
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

  getUsuarioFromToken(token: string | null) {
    if (!token || !canUseStorage()) {
      return null;
    }

    const payload = parseJwtPayload(token);

    if (!payload?.sub || !payload.perfil) {
      return null;
    }

    return {
      email: payload.sub,
      perfil: payload.perfil
    } satisfies AuthUsuario;
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
