"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth-service";
import type { AuthUsuario } from "@/types/auth";

type AuthContextValue = {
  token: string | null;
  usuario: AuthUsuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<AuthUsuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.me()
      .then((response) => setUsuario(authService.getUsuarioFromResponse(response)))
      .catch(() => setUsuario(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const response = await authService.login(email, senha);
    const authUsuario = authService.getUsuarioFromResponse(response);

    if (!authUsuario) {
      await authService.logout();
      throw new Error("Nao foi possivel identificar o perfil do usuario autenticado.");
    }

    setUsuario(authUsuario);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: null,
      usuario,
      isLoading,
      isAuthenticated: Boolean(usuario),
      login,
      logout
    }),
    [isLoading, login, logout, usuario]
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
