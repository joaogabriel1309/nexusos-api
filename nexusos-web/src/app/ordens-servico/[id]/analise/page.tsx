"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoAnaliseForm } from "@/components/shared/ordem-servico-analise-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import type { OrdemServicoAnaliseFormData } from "@/schemas/ordem-servico-analise-schema";
import { clienteService } from "@/services/cliente-service";
import { ordemServicoService } from "@/services/ordem-servico-service";

export default function AnaliseOrdemServicoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const isDesenvolvedor = usuario?.perfil === "DESENVOLVEDOR";
  const id = params.id;

  const ordemQuery = useQuery({
    queryKey: ["ordens-servico", id],
    queryFn: () => ordemServicoService.buscarPorId(id),
    enabled: Boolean(id)
  });
  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: clienteService.listar,
    enabled: !isDesenvolvedor
  });

  const ordem = ordemQuery.data;
  const valorHora = useMemo(() => {
    if (!ordem || isDesenvolvedor) {
      return 0;
    }

    return (clientesQuery.data ?? []).find((cliente) => cliente.id === ordem.clienteId)?.valorHora ?? 0;
  }, [clientesQuery.data, isDesenvolvedor, ordem]);
  const isLoading = ordemQuery.isLoading || (!isDesenvolvedor && clientesQuery.isLoading);
  const isError = ordemQuery.isError || (!isDesenvolvedor && clientesQuery.isError);

  const analiseMutation = useMutation({
    mutationFn: (data: OrdemServicoAnaliseFormData) => {
      if (!ordem) {
        throw new Error("Ticket n?o carregado.");
      }

      return ordemServicoService.atualizarAnalise(ordem.id, data);
    },
    onSuccess: (ordemAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico", id] });
      queryClient.invalidateQueries({ queryKey: ["auditoria", "ordens-servico", id] });
      toast.success("Análise do ticket salva com sucesso.");
      router.push(`/ordens-servico/${ordemAtualizada.id}`);
    },
    onError: () => {
      toast.error("Não foi possível salvar a análise do ticket.");
    }
  });

  function recarregar() {
    ordemQuery.refetch();
    if (!isDesenvolvedor) {
      clientesQuery.refetch();
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={ordem ? `${ordem.status === "EM_ANALISE" ? "Analisar" : "Visualizar análise"} ticket ${ordem.codigo}` : "Análise do ticket"}
        description="Informe ou consulte a estimativa e o texto técnico do ticket."
        actions={
          <Button variant="outline" onClick={() => router.push(`/ordens-servico/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isError || !ordem ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Não foi possível carregar a análise do ticket.</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            <OrdemServicoAnaliseForm
              ordem={ordem}
              valorHora={valorHora}
              isSubmitting={analiseMutation.isPending}
              readOnly={ordem.status !== "EM_ANALISE"}
              developerMode={isDesenvolvedor}
              onSubmit={(data) => analiseMutation.mutate(data)}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
