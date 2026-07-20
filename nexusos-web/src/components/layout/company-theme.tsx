"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { aplicarCorPrincipal } from "@/lib/cor-principal";
import { useAuth } from "@/providers/auth-provider";
import { configuracaoEmpresaService } from "@/services/configuracao-empresa-service";

export const configuracaoEmpresaQueryKey = ["configuracao-empresa"];

export function CompanyTheme() {
  const { usuario } = useAuth();
  const query = useQuery({ queryKey: configuracaoEmpresaQueryKey, queryFn: configuracaoEmpresaService.buscar,
    enabled: Boolean(usuario), staleTime: 5 * 60 * 1000 });
  useEffect(() => {
    if (query.data?.corPrincipal) aplicarCorPrincipal(query.data.corPrincipal);
  }, [query.data?.corPrincipal]);
  return null;
}
