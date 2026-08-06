"use client";

import { useQuery } from "@tanstack/react-query";
import { solicitacaoService } from "@/services/solicitacao-service";

export function useSolicitacoesPendentes(enabled: boolean) {
  return useQuery({
    queryKey: ["solicitacoes", "resumo"],
    queryFn: solicitacaoService.resumo,
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000
  });
}
