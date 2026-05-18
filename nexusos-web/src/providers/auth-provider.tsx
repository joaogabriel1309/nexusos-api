"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Usuario } from "@/types";
import { authService } from "@/services/auth-service";

type AuthContextValue = {
  token: string | null;
  usuario: Usuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [usuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setToken(authService.getToken());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const response = await authService.login(email, senha);
    setToken(response.accessToken);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      usuario,
      isLoading,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [isLoading, login, logout, token, usuario]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
