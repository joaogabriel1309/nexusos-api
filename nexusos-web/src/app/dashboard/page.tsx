"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock, Code2, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prioridadeLabels, statusLabels, statusOptions } from "@/lib/os-labels";
import { dashboardService } from "@/services/dashboard-service";
import type { PrioridadeOS, StatusOS } from "@/types";

const resumoQueryKey = ["dashboard", "resumo"];
const statusQueryKey = ["dashboard", "status"];
const produtividadeQueryKey = ["dashboard", "produtividade"];

const statusFluxo: StatusOS[] = [
  "RECEBIDA",
  "EM_ANALISE",
  "APROVADA",
  "EM_DESENVOLVIMENTO",
  "EM_TESTE",
  "AGUARDANDO_PAGAMENTO",
  "FINALIZADA"
];

const prioridades: PrioridadeOS[] = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];

function formatarHoras(valor?: number) {
  return `${Math.round(valor ?? 0)}h`;
}

export default function DashboardPage() {
  const resumoQuery = useQuery({
    queryKey: resumoQueryKey,
    queryFn: dashboardService.resumo
  });

  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: dashboardService.osPorStatus
  });

  const produtividadeQuery = useQuery({
    queryKey: produtividadeQueryKey,
    queryFn: dashboardService.produtividade
  });

  const resumo = resumoQuery.data;
  const statusData = statusQuery.data ?? {};
  const produtividade = produtividadeQuery.data;
  const emDesenvolvimento = statusData.EM_DESENVOLVIMENTO ?? 0;
  const maiorStatus = Math.max(...statusOptions.map((status) => statusData[status] ?? 0), 1);
  const isLoading = resumoQuery.isLoading || statusQuery.isLoading || produtividadeQuery.isLoading;
  const isError = resumoQuery.isError || statusQuery.isError || produtividadeQuery.isError;

  const metrics = [
    { title: "OS abertas", value: resumo?.osAbertas ?? 0, icon: ClipboardList, hint: `${resumo?.totalOs ?? 0} OS no total` },
    { title: "Em desenvolvimento", value: emDesenvolvimento, icon: Code2, hint: "status atual" },
    { title: "Finalizadas", value: resumo?.osFinalizadas ?? 0, icon: CheckCircle2, hint: `${produtividade?.percentualFinalizacao.toFixed(1) ?? "0.0"}% do total` },
    { title: "Tempo medio", value: formatarHoras(resumo?.tempoMedioFinalizacaoHoras), icon: Clock, hint: "ate finalizacao" }
  ];

  function recarregar() {
    resumoQuery.refetch();
    statusQuery.refetch();
    produtividadeQuery.refetch();
  }

  return (
    <AppShell>
      <PageHeader title="Dashboard" description="Visao executiva das ordens de servico e produtividade tecnica." />

      {isLoading ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-4 h-8 w-20" />
                <Skeleton className="mt-2 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Nao foi possivel carregar os dados do dashboard.</span>
            <Button variant="outline" size="sm" onClick={recarregar}>
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                    <Icon className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{metric.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Fluxo operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusFluxo.map((status) => {
                  const total = statusData[status] ?? 0;
                  const width = Math.max((total / maiorStatus) * 100, total > 0 ? 8 : 0);

                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-48 text-sm text-muted-foreground">{statusLabels[status]}</div>
                      <div className="h-2 flex-1 rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                      <div className="w-10 text-right text-sm font-medium">{total}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prioridades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prioridades.map((prioridade) => (
                  <div key={prioridade} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{prioridadeLabels[prioridade]}</span>
                    <span className="font-medium">{resumo?.osPorPrioridade?.[prioridade] ?? 0}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </AppShell>
  );
}
