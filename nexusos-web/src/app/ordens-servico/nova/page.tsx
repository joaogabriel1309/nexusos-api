"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoForm } from "@/components/shared/ordem-servico-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
import { clienteService } from "@/services/cliente-service";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { projetoService } from "@/services/projeto-service";
import { usuarioService } from "@/services/usuario-service";

export default function NovaOrdemServicoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const isDesenvolvedor = usuario?.perfil === "DESENVOLVEDOR";

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: clienteService.listar,
    enabled: !isDesenvolvedor
  });
  const projetosQuery = useQuery({
    queryKey: ["projetos"],
    queryFn: projetoService.listar,
    enabled: !isDesenvolvedor
  });
  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: usuarioService.listar,
    enabled: !isDesenvolvedor
  });

  const clientes = useMemo(() => (clientesQuery.data ?? []).filter((cliente) => cliente.ativo), [clientesQuery.data]);
  const projetos = useMemo(() => (projetosQuery.data ?? []).filter((projeto) => projeto.ativo), [projetosQuery.data]);
  const responsaveis = useMemo(
    () => (usuariosQuery.data ?? []).filter((usuario) => usuario.ativo),
    [usuariosQuery.data]
  );
  const isLoading = clientesQuery.isLoading || projetosQuery.isLoading || usuariosQuery.isLoading;
  const isError = clientesQuery.isError || projetosQuery.isError || usuariosQuery.isError;

  const salvarMutation = useMutation({
    mutationFn: (data: OrdemServicoFormData) => ordemServicoService.criar(data),
    onSuccess: (ordem) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      toast.success("OS cadastrada com sucesso.");
      router.push(`/ordens-servico/${ordem.id}`);
    },
    onError: () => {
      toast.error("Nao foi possivel salvar a OS.");
    }
  });

  function recarregar() {
    clientesQuery.refetch();
    projetosQuery.refetch();
    usuariosQuery.refetch();
  }

  return (
    <AppShell>
      <PageHeader
        title="Nova OS"
        description="Registre a demanda inicial para analise tecnica."
        actions={
          <Button variant="outline" onClick={() => router.push("/ordens-servico")}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isDesenvolvedor ? (
            <div className="text-sm text-muted-foreground">Seu perfil nao pode cadastrar OS.</div>
          ) : isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isError ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nao foi possivel carregar os dados para cadastro.</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            <OrdemServicoForm
              clientes={clientes}
              responsaveis={responsaveis}
              projetos={projetos}
              isSubmitting={salvarMutation.isPending}
              onSubmit={(data) => salvarMutation.mutate(data)}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
