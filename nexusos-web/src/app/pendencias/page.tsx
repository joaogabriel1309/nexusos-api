"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, CircleDollarSign, RefreshCcw, UserRoundX, UserCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ordemServicoService } from "@/services/ordem-servico-service";
import type { CentralPendencias, OrdemServico } from "@/types";

const secoes: Array<{ chave: keyof CentralPendencias; titulo: string; descricao: string; icon: typeof AlertCircle }> = [
  { chave: "vencidas", titulo: "OS vencidas", descricao: "Prazo ultrapassado", icon: AlertCircle },
  { chave: "vencemHoje", titulo: "Vencem hoje", descricao: "Precisam de atencao imediata", icon: CalendarClock },
  { chave: "semResponsavel", titulo: "Sem responsavel", descricao: "Atribua um responsavel", icon: UserRoundX },
  { chave: "aguardandoAprovacaoAdmin", titulo: "Aguardando aprovacao do admin", descricao: "Novas OS para triagem", icon: ShieldCheck },
  { chave: "aguardandoCliente", titulo: "Aguardando cliente", descricao: "Analise enviada ao cliente", icon: UserCheck },
  { chave: "aguardandoPagamento", titulo: "Aguardando pagamento", descricao: "Pagamento ainda pendente", icon: CircleDollarSign },
  { chave: "reprovadasPeloCliente", titulo: "Reprovadas pelo cliente", descricao: "Requerem revisao da analise", icon: AlertCircle }
];

function formatarPrazo(prazo?: string) {
  if (!prazo) return "Sem prazo";
  return new Date(`${prazo}T00:00:00`).toLocaleDateString("pt-BR");
}

function Item({ ordem }: { ordem: OrdemServico }) {
  return (
    <Link href={`/ordens-servico/${ordem.id}`} className="block rounded-md border p-3 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">OS {ordem.codigo} - {ordem.titulo}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{ordem.clienteNome}{ordem.responsavelNome ? ` · ${ordem.responsavelNome}` : " · Sem responsavel"}</p>
        </div>
        <Badge variant="outline" className="shrink-0">{formatarPrazo(ordem.prazo)}</Badge>
      </div>
    </Link>
  );
}

export default function PendenciasPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ordens-servico", "pendencias"],
    queryFn: ordemServicoService.listarPendencias
  });
  const total = data ? secoes.reduce((soma, secao) => soma + data[secao.chave].length, 0) : 0;

  return (
    <AppShell>
      <PageHeader title="Central de Pendencias" description="Tudo que precisa de acao em um unico lugar." />
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : isError || !data ? (
        <Card><CardContent className="flex items-center justify-between gap-4 p-6"><p className="text-sm text-muted-foreground">Nao foi possivel carregar as pendencias.</p><Button variant="outline" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></CardContent></Card>
      ) : total === 0 ? (
        <Card><CardContent className="p-10 text-center"><p className="font-medium">Nenhuma pendencia no momento.</p><p className="mt-1 text-sm text-muted-foreground">Todas as ordens estao em dia.</p></CardContent></Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {secoes.map((secao) => {
            const Icon = secao.icon;
            const ordens = data[secao.chave];
            return (
              <Card key={secao.chave}>
                <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" />{secao.titulo}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{secao.descricao}</p></div><Badge>{ordens.length}</Badge></div></CardHeader>
                <CardContent className="space-y-2">{ordens.length ? ordens.map((ordem) => <Item key={ordem.id} ordem={ordem} />) : <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhuma OS nesta categoria.</p>}</CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
