"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Inbox, RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels } from "@/lib/os-labels";
import {
  protocoloSolicitacao,
  solicitacaoStatusClasses,
  solicitacaoStatusLabels
} from "@/lib/solicitacao-labels";
import { solicitacaoService } from "@/services/solicitacao-service";
import type { StatusSolicitacao } from "@/types";

const todos = "TODOS";
const itensPorPagina = 15;

function dataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data));
}

export default function SolicitacoesPage() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusSolicitacao | typeof todos>(todos);
  const [pagina, setPagina] = useState(1);
  const query = useQuery({
    queryKey: ["solicitacoes"],
    queryFn: solicitacaoService.listar,
    refetchInterval: 30_000
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return (query.data ?? []).filter((solicitacao) => {
      const correspondeStatus = status === todos || solicitacao.status === status;
      const correspondeBusca = !termo || [
        protocoloSolicitacao(solicitacao.codigo), solicitacao.titulo,
        solicitacao.descricao, solicitacao.clienteNome, solicitacao.responsavelNome ?? ""
      ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));
      return correspondeStatus && correspondeBusca;
    });
  }, [busca, query.data, status]);

  const paginadas = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return filtradas.slice(inicio, inicio + itensPorPagina);
  }, [filtradas, pagina]);

  useEffect(() => setPagina(1), [busca, status]);

  const pendentes = (query.data ?? []).filter((item) => item.status === "NOVA" || item.status === "EM_ANALISE").length;
  const aguardando = (query.data ?? []).filter((item) => item.status === "AGUARDANDO_CLIENTE").length;

  return (
    <AppShell>
      <PageHeader
        title="Solicitações"
        description="Faça a triagem dos pedidos antes de transformá-los em Tickets."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Precisam da equipe</p><p className="mt-2 text-2xl font-semibold">{pendentes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Aguardando cliente</p><p className="mt-2 text-2xl font-semibold">{aguardando}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Total</p><p className="mt-2 text-2xl font-semibold">{query.data?.length ?? 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" placeholder="Buscar protocolo, cliente ou assunto" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusSolicitacao | typeof todos)}>
              <SelectTrigger><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={todos}>Todos os status</SelectItem>
                {(Object.keys(solicitacaoStatusLabels) as StatusSolicitacao[]).map((item) => (
                  <SelectItem key={item} value={item}>{solicitacaoStatusLabels[item]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {query.isLoading ? (
            <div className="grid gap-3 xl:grid-cols-2">{Array.from({ length: 6 }).map((_, indice) => <Skeleton key={indice} className="h-36" />)}</div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar as solicitações.</p>
              <Button variant="outline" onClick={() => query.refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="py-12 text-center"><Inbox className="mx-auto h-9 w-9 text-muted-foreground" /><p className="mt-3 font-medium">Nenhuma solicitação encontrada</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou aguarde uma nova solicitação do cliente.</p></div>
          ) : (
            <>
              <div className="grid gap-3 xl:hidden">
                {paginadas.map((item) => (
                  <Link key={item.id} href={`/solicitacoes/${item.id}`} className="min-w-0 rounded-md border p-4 transition-colors hover:bg-secondary/40">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-xs font-semibold text-primary">{protocoloSolicitacao(item.codigo)}</p><p className="mt-1 line-clamp-2 break-words font-medium [overflow-wrap:anywhere]">{item.titulo}</p></div>
                      <Badge variant="outline" className={`shrink-0 whitespace-nowrap ${solicitacaoStatusClasses[item.status]}`}>{solicitacaoStatusLabels[item.status]}</Badge>
                    </div>
                    <p className="mt-3 truncate text-sm">{item.clienteNome}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.responsavelNome ?? "Sem responsável"} · {dataHora(item.atualizadoEm)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{item.prioridade ? prioridadeLabels[item.prioridade] : "Urgência não informada"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <Table className="min-w-[980px]">
                  <TableHeader><TableRow><TableHead>Solicitação</TableHead><TableHead>Cliente</TableHead><TableHead>Criação</TableHead><TableHead>Urgência</TableHead><TableHead>Status</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Abrir</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginadas.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><div className="max-w-[360px]"><Link href={`/solicitacoes/${item.id}`} className="font-medium hover:underline">{protocoloSolicitacao(item.codigo)} · {item.titulo}</Link><p className="truncate text-xs text-muted-foreground">{item.descricao}</p></div></TableCell>
                        <TableCell>{item.clienteNome}</TableCell>
                        <TableCell className="whitespace-nowrap">{dataHora(item.criadoEm)}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.prioridade ? prioridadeLabels[item.prioridade] : "Não informada"}</TableCell>
                        <TableCell><Badge variant="outline" className={`whitespace-nowrap ${solicitacaoStatusClasses[item.status]}`}>{solicitacaoStatusLabels[item.status]}</Badge></TableCell>
                        <TableCell>{item.responsavelNome ?? "Sem responsável"}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" asChild><Link href={`/solicitacoes/${item.id}`} title="Abrir solicitação"><ArrowRight className="h-4 w-4" /><span className="sr-only">Abrir solicitação</span></Link></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
        {!query.isLoading && !query.isError && filtradas.length > 0 ? <TablePagination page={pagina} totalItems={filtradas.length} pageSize={itensPorPagina} onPageChange={setPagina} /> : null}
      </Card>
    </AppShell>
  );
}
