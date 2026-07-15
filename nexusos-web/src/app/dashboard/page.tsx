"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Clock, Code2, RefreshCcw, UserX } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prioridadeLabels, statusLabels, statusOptions } from "@/lib/os-labels";
import { dashboardService } from "@/services/dashboard-service";
import type { PrioridadeOS, StatusOS } from "@/types";

const resumoQueryKey = ["dashboard", "resumo"];
const statusQueryKey = ["dashboard", "status"];
const produtividadeQueryKey = ["dashboard", "produtividade"];
const finalizadasMesQueryKey = ["dashboard", "finalizadas-por-mes"];

const statusFluxo: StatusOS[] = [
  "RECEBIDA",
  "EM_ANALISE",
  "AGUARDANDO_APROVACAO",
  "APROVADA",
  "EM_DESENVOLVIMENTO",
  "EM_TESTE",
  "AGUARDANDO_PAGAMENTO",
  "FINALIZADA"
];

const prioridades: PrioridadeOS[] = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];
const prioridadeCores: Record<PrioridadeOS, string> = {
  CRITICA: "bg-red-500",
  ALTA: "bg-orange-500",
  MEDIA: "bg-sky-500",
  BAIXA: "bg-emerald-500"
};
const statusCores = ["#0ea5e9", "#8b5cf6", "#d946ef", "#6366f1", "#2563eb", "#f59e0b", "#f97316", "#10b981"];

function formatarHoras(valor?: number) {
  return `${Math.round(valor ?? 0)}h`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function ordensHref(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/ordens-servico?${search.toString()}`;
}

function statusHref(status: StatusOS) {
  return status === "FINALIZADA" ? "/ordens-servico/finalizadas" : ordensHref({ status });
}

function RingChart({ value, label }: { value: number; label: string }) {
  const percent = clampPercent(value);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 112 112" className="h-28 w-28 shrink-0">
        <circle cx="56" cy="56" r={radius} className="fill-none stroke-secondary" strokeWidth="12" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          className="fill-none stroke-primary transition-all"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 56 56)"
        />
        <text x="56" y="53" textAnchor="middle" className="fill-foreground text-xl font-semibold">
          {percent.toFixed(0)}%
        </text>
        <text x="56" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
          concluido
        </text>
      </svg>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-1 text-sm text-muted-foreground">Percentual de OS finalizadas em relacao ao total cadastrado.</p>
      </div>
    </div>
  );
}

function MonthlyBarChart({ data }: { data: Array<{ mes: string; rotulo: string; total: number }> }) {
  const max = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="flex h-72 items-end gap-3 rounded-md border bg-secondary/20 p-4">
      {data.map((item) => {
        const height = Math.max((item.total / max) * 100, item.total > 0 ? 8 : 2);
        return (
          <div key={item.mes} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-48 w-full items-end">
              <div
                className="w-full rounded-t-md bg-primary shadow-sm transition-all"
                style={{ height: `${height}%` }}
                title={`${item.total} OS finalizadas`}
              />
            </div>
            <div className="text-sm font-semibold">{item.total}</div>
            <div className="w-full truncate text-center text-xs text-muted-foreground" title={item.rotulo}>
              {item.rotulo}
            </div>
          </div>
        );
      })}
    </div>
  );
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

  const finalizadasMesQuery = useQuery({
    queryKey: finalizadasMesQueryKey,
    queryFn: dashboardService.finalizadasPorMes
  });

  const resumo = resumoQuery.data;
  const statusData = statusQuery.data ?? {};
  const produtividade = produtividadeQuery.data;
  const finalizadasPorMes = finalizadasMesQuery.data ?? [];
  const emDesenvolvimento = statusData.EM_DESENVOLVIMENTO ?? 0;
  const maiorStatus = Math.max(...statusOptions.map((status) => statusData[status] ?? 0), 1);
  const totalOs = resumo?.totalOs ?? 0;
  const isLoading = resumoQuery.isLoading || statusQuery.isLoading || produtividadeQuery.isLoading || finalizadasMesQuery.isLoading;
  const isError = resumoQuery.isError || statusQuery.isError || produtividadeQuery.isError || finalizadasMesQuery.isError;

  const metrics: Array<{
    title: string;
    value: number | string;
    icon: typeof ClipboardList;
    hint: string;
    href?: string;
  }> = [
    { title: "OS abertas", value: resumo?.osAbertas ?? 0, icon: ClipboardList, hint: `${resumo?.totalOs ?? 0} OS no total`, href: "/ordens-servico" },
    { title: "Em desenvolvimento", value: emDesenvolvimento, icon: Code2, hint: "status atual", href: ordensHref({ status: "EM_DESENVOLVIMENTO" }) },
    {
      title: "Finalizadas",
      value: resumo?.osFinalizadas ?? 0,
      icon: CheckCircle2,
      hint: `${produtividade?.percentualFinalizacao.toFixed(1) ?? "0.0"}% do total`,
      href: "/ordens-servico/finalizadas"
    },
    { title: "Tempo medio", value: formatarHoras(resumo?.tempoMedioFinalizacaoHoras), icon: Clock, hint: "ate finalizacao" },
    { title: "OS vencidas", value: resumo?.osVencidas ?? 0, icon: AlertTriangle, hint: "prazo expirado", href: ordensHref({ prazo: "vencidas" }) },
    { title: "Vencem hoje", value: resumo?.osVencemHoje ?? 0, icon: CalendarClock, hint: "atencao no dia", href: ordensHref({ prazo: "hoje" }) },
    {
      title: "Sem responsavel",
      value: resumo?.osSemResponsavel ?? 0,
      icon: UserX,
      hint: "precisam de atribuicao",
      href: ordensHref({ responsavel: "sem-responsavel" })
    }
  ];

  function recarregar() {
    resumoQuery.refetch();
    statusQuery.refetch();
    produtividadeQuery.refetch();
    finalizadasMesQuery.refetch();
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
              const numericValue = typeof metric.value === "number" ? metric.value : Number.parseFloat(String(metric.value)) || 0;
              const percent = totalOs > 0 ? Math.min((numericValue / totalOs) * 100, 100) : 0;
              const card = (
                <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/40 group-hover:bg-secondary/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {metric.href ? <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /> : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{metric.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                    <div className="mt-4 h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );

              return metric.href ? (
                <Link key={metric.title} href={metric.href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {card}
                </Link>
              ) : (
                <div key={metric.title}>{card}</div>
              );
            })}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Fluxo operacional por status</CardTitle>
                <CardDescription>Distribuicao atual das OS em cada etapa do workflow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusFluxo.map((status, index) => {
                  const total = statusData[status] ?? 0;
                  const width = Math.max((total / maiorStatus) * 100, total > 0 ? 8 : 0);

                  return (
                    <Link
                      key={status}
                      href={statusHref(status)}
                      className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="w-48 text-sm text-muted-foreground">{statusLabels[status]}</div>
                      <div className="h-2 flex-1 rounded-full bg-secondary">
                        <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: statusCores[index] }} />
                      </div>
                      <div className="w-10 text-right text-sm font-medium">{total}</div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saude da operacao</CardTitle>
                <CardDescription>Conclusao geral das ordens cadastradas.</CardDescription>
              </CardHeader>
              <CardContent>
                <RingChart value={produtividade?.percentualFinalizacao ?? 0} label={`${resumo?.osFinalizadas ?? 0} OS finalizadas`} />
              </CardContent>
            </Card>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>OS finalizadas por mes</CardTitle>
                <CardDescription>Volume de conclusoes nos ultimos 6 meses.</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyBarChart data={finalizadasPorMes} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prioridades em aberto</CardTitle>
                <CardDescription>Distribuicao por criticidade operacional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prioridades.map((prioridade) => {
                  const total = resumo?.osPorPrioridade?.[prioridade] ?? 0;
                  const width = totalOs > 0 ? Math.max((total / totalOs) * 100, total > 0 ? 8 : 0) : 0;
                  return (
                    <Link
                      key={prioridade}
                      href={ordensHref({ prioridade })}
                      className="group block space-y-2 rounded-md p-2 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{prioridadeLabels[prioridade]}</span>
                        <span className="flex items-center gap-2 font-medium">
                          {total}
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div className={`h-2 rounded-full ${prioridadeCores[prioridade]}`} style={{ width: `${width}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </section>

          <section className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>SLA por prioridade</CardTitle>
                <CardDescription>Prazo padrao configurado para cada nivel de prioridade.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {prioridades.map((prioridade) => (
                  <div key={prioridade} className="rounded-md border bg-secondary/30 p-4">
                    <div className="text-sm text-muted-foreground">{prioridadeLabels[prioridade]}</div>
                    <div className="mt-2 text-2xl font-semibold">{resumo?.slaPorPrioridade?.[prioridade] ?? 0}d</div>
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
