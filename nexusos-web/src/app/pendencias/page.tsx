"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, CircleDollarSign, RefreshCcw, ShieldCheck, UserCheck, UserRoundX } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { ordemServicoService } from "@/services/ordem-servico-service";
import type { CentralPendencias, OrdemServico } from "@/types";

const secoes: Array<{ chave: keyof CentralPendencias; titulo: string; descricao: string; icon: typeof AlertCircle }> = [
  { chave: "vencidas", titulo: "Vencidos", descricao: "Prazo ultrapassado", icon: AlertCircle },
  { chave: "vencemHoje", titulo: "Vencem hoje", descricao: "Ação imediata", icon: CalendarClock },
  { chave: "semResponsavel", titulo: "Sem responsável", descricao: "Precisam de atribuição", icon: UserRoundX },
  { chave: "reprovadasPeloCliente", titulo: "Ajuste solicitado", descricao: "Cliente pediu alteração", icon: AlertCircle },
  { chave: "aguardandoAprovacaoAdmin", titulo: "Aprovação interna", descricao: "Decisão do administrador", icon: ShieldCheck },
  { chave: "aguardandoCliente", titulo: "Com o cliente", descricao: "Aguardando decisão", icon: UserCheck },
  { chave: "aguardandoPagamento", titulo: "Pagamento", descricao: "Recebimento pendente", icon: CircleDollarSign }
];

type FilaItem = {
  ordem: OrdemServico;
  motivos: typeof secoes;
};

function Item({ item }: { item: FilaItem }) {
  return (
    <Link
      href={`/ordens-servico/${item.ordem.id}?origem=pendencias`}
      className="block min-w-0 rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{item.ordem.codigo} - {item.ordem.titulo}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.ordem.clienteNome} · {item.ordem.responsavelNome ?? "Sem responsável"}
          </p>
        </div>
        <span className={cn("inline-flex w-fit shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold", prazoClasses(item.ordem.prazo))}>
          {formatarDataPrazo(item.ordem.prazo)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.motivos.map((motivo) => <Badge key={motivo.chave} variant="outline">{motivo.titulo}</Badge>)}
      </div>
    </Link>
  );
}

export default function PendenciasPage() {
  const [filtro, setFiltro] = useState<keyof CentralPendencias | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ordens-servico", "pendencias"],
    queryFn: ordemServicoService.listarPendencias
  });

  const fila = useMemo(() => {
    if (!data) return [];
    const porId = new Map<string, FilaItem>();

    for (const secao of secoes) {
      for (const ordem of data[secao.chave]) {
        const atual = porId.get(ordem.id);
        if (atual) atual.motivos.push(secao);
        else porId.set(ordem.id, { ordem, motivos: [secao] });
      }
    }

    return Array.from(porId.values()).sort((a, b) => {
      const prioridade = secoes.findIndex((secao) => secao.chave === a.motivos[0]?.chave)
        - secoes.findIndex((secao) => secao.chave === b.motivos[0]?.chave);
      if (prioridade !== 0) return prioridade;
      return (a.ordem.prazo ?? "9999-12-31").localeCompare(b.ordem.prazo ?? "9999-12-31");
    });
  }, [data]);

  const filaVisivel = filtro ? fila.filter((item) => item.motivos.some((motivo) => motivo.chave === filtro)) : fila;

  return (
    <AppShell>
      <PageHeader title="Pendências" description="Uma fila única com tudo que precisa de decisão ou acompanhamento." />

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>
      ) : isError || !data ? (
        <Card><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Não foi possível carregar as pendências.</p><Button variant="outline" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></CardContent></Card>
      ) : fila.length === 0 ? (
        <Card><CardContent className="p-10 text-center"><p className="font-medium">Tudo em dia</p><p className="mt-1 text-sm text-muted-foreground">Não há tickets aguardando ação.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar pendências">
            <Button variant={filtro === null ? "secondary" : "outline"} className="shrink-0" onClick={() => setFiltro(null)}>
              Todas <Badge className="ml-1">{fila.length}</Badge>
            </Button>
            {secoes.map((secao) => {
              const Icon = secao.icon;
              return (
                <Button key={secao.chave} variant={filtro === secao.chave ? "secondary" : "outline"} className="shrink-0" onClick={() => setFiltro(secao.chave)}>
                  <Icon className="h-4 w-4" /> {secao.titulo} <Badge className="ml-1">{data[secao.chave].length}</Badge>
                </Button>
              );
            })}
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div><CardTitle>Fila de ação</CardTitle><p className="mt-1 text-sm text-muted-foreground">Cada ticket aparece uma vez, com todos os motivos de atenção.</p></div>
              <Badge variant="secondary">{filaVisivel.length}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {filaVisivel.map((item) => <Item key={item.ordem.id} item={item} />)}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
