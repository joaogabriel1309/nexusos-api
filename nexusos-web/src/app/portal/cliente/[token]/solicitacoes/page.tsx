"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Inbox, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { PortalNavigation } from "@/components/portal/portal-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  protocoloSolicitacao,
  solicitacaoStatusClasses,
  solicitacaoStatusClienteLabels
} from "@/lib/solicitacao-labels";
import { portalSolicitacaoService } from "@/services/solicitacao-service";
import type { StatusSolicitacao } from "@/types";

const todos = "TODOS";

function data(dataIso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(dataIso));
}

export default function MinhasSolicitacoesPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<StatusSolicitacao | typeof todos>(todos);
  const query = useQuery({
    queryKey: ["portal-solicitacoes", token],
    queryFn: () => portalSolicitacaoService.listar(token),
    refetchInterval: 15_000
  });
  const itens = useMemo(() => (query.data ?? []).filter((item) => status === todos || item.status === status), [query.data, status]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 py-7 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2"><div className="text-sm font-semibold text-primary">NexusOS</div><h1 className="text-2xl font-semibold">Minhas solicitações</h1><p className="text-sm text-muted-foreground">Acompanhe pedidos que ainda estão sendo avaliados pela equipe.</p></header>
        <PortalNavigation token={token} active="solicitacoes" />

        <div className="flex justify-end"><Select value={status} onValueChange={(value) => setStatus(value as StatusSolicitacao | typeof todos)}><SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filtrar por etapa" /></SelectTrigger><SelectContent><SelectItem value={todos}>Todas as etapas</SelectItem>{(Object.keys(solicitacaoStatusClienteLabels) as StatusSolicitacao[]).map((item) => <SelectItem key={item} value={item}>{solicitacaoStatusClienteLabels[item]}</SelectItem>)}</SelectContent></Select></div>

        {query.isLoading ? <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, indice) => <Skeleton key={indice} className="h-44" />)}</div> : query.isError ? (
          <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p>Não foi possível carregar suas solicitações.</p><Button variant="outline" onClick={() => query.refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></CardContent></Card>
        ) : itens.length === 0 ? (
          <Card><CardContent className="p-10 text-center"><Inbox className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-medium">Nenhuma solicitação encontrada</p><p className="mt-1 text-sm text-muted-foreground">Quando você enviar uma solicitação, ela aparecerá aqui.</p></CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {itens.map((item) => (
              <Link key={item.id} href={`/portal/cliente/${token}/solicitacoes/${item.id}`} className="min-w-0 rounded-md border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-primary">{protocoloSolicitacao(item.codigo)}</p><h2 className="mt-1 line-clamp-2 break-words font-semibold [overflow-wrap:anywhere]">{item.titulo}</h2></div><Badge variant="outline" className={`shrink-0 whitespace-nowrap ${solicitacaoStatusClasses[item.status]}`}>{solicitacaoStatusClienteLabels[item.status]}</Badge></div>
                <p className="mt-3 line-clamp-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{item.descricao}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Atualizada em {data(item.atualizadoEm)}</span><ArrowRight className="h-4 w-4" /></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
