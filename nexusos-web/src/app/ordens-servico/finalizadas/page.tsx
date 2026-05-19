"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels } from "@/lib/os-labels";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { projetoService } from "@/services/projeto-service";
import type { PrioridadeOS } from "@/types";

const ordensFinalizadasQueryKey = ["ordens-servico", "finalizadas"];
const projetosQueryKey = ["projetos"];
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const todosClientesOption = "__todos__";
const todosProjetosOption = "__todos_projetos__";

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

function formatarDataHora(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(data));
}

export default function OrdensServicoFinalizadasPage() {
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const ordensQuery = useQuery({
    queryKey: ordensFinalizadasQueryKey,
    queryFn: ordemServicoService.listar,
    select: (ordens) => ordens.filter((ordem) => ordem.status === "FINALIZADA")
  });

  const projetosQuery = useQuery({
    queryKey: projetosQueryKey,
    queryFn: projetoService.listar
  });

  const ordens = useMemo(() => ordensQuery.data ?? [], [ordensQuery.data]);
  const projetos = useMemo(() => (projetosQuery.data ?? []).filter((projeto) => projeto.ativo), [projetosQuery.data]);
  const clientes = useMemo(() => {
    return Array.from(new Map(ordens.map((ordem) => [ordem.clienteId, ordem.clienteNome])).entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [ordens]);

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((ordem) => {
      const finalizadoEm = ordem.finalizadoEm ? new Date(ordem.finalizadoEm) : null;
      const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
      const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

      const matchCliente = clienteFiltro ? ordem.clienteId === clienteFiltro : true;
      const matchProjeto = projetoFiltro ? ordem.projetoId === projetoFiltro : true;
      const matchInicio = inicio && finalizadoEm ? finalizadoEm >= inicio : true;
      const matchFim = fim && finalizadoEm ? finalizadoEm <= fim : true;

      return matchCliente && matchProjeto && matchInicio && matchFim;
    });
  }, [clienteFiltro, dataFim, dataInicio, ordens, projetoFiltro]);

  const totalValor = useMemo(() => {
    return ordensFiltradas.reduce((total, ordem) => total + (ordem.valorTotalEstimado ?? 0), 0);
  }, [ordensFiltradas]);

  function limparFiltros() {
    setClienteFiltro("");
    setProjetoFiltro("");
    setDataInicio("");
    setDataFim("");
  }

  return (
    <AppShell>
      <PageHeader
        title="OS Finalizadas"
        description="Consulte ordens encerradas, data de finalizacao e resumo do que foi feito."
      />

      <Card>
        <CardContent className="p-5">
          {ordensQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : ordensQuery.isError || projetosQuery.isError ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nao foi possivel carregar as OS finalizadas.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  ordensQuery.refetch();
                  projetosQuery.refetch();
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : ordens.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma OS finalizada.</div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_160px_160px_auto]">
                <Select
                  value={clienteFiltro || todosClientesOption}
                  onValueChange={(value) => setClienteFiltro(value === todosClientesOption ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={todosClientesOption}>Todos os clientes</SelectItem>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={projetoFiltro || todosProjetosOption}
                  onValueChange={(value) => setProjetoFiltro(value === todosProjetosOption ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={todosProjetosOption}>Todos os projetos</SelectItem>
                    {projetos.map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
                <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
                <Button variant="outline" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border bg-secondary/40 p-4">
                  <div className="text-sm text-muted-foreground">OS filtradas</div>
                  <div className="mt-1 text-2xl font-semibold">{ordensFiltradas.length}</div>
                </div>
                <div className="rounded-md border bg-secondary/40 p-4 sm:col-span-2">
                  <div className="text-sm text-muted-foreground">Valor total filtrado</div>
                  <div className="mt-1 text-2xl font-semibold">{moeda.format(totalValor)}</div>
                </div>
              </div>

              {ordensFiltradas.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma OS encontrada para os filtros informados.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Finalizada em</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>O que foi feito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordensFiltradas.map((ordem) => (
                      <TableRow key={ordem.id}>
                        <TableCell className="font-medium">{ordem.titulo}</TableCell>
                        <TableCell>{ordem.clienteNome}</TableCell>
                        <TableCell>{ordem.projetoNome || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                        </TableCell>
                        <TableCell>{formatarDataHora(ordem.finalizadoEm)}</TableCell>
                        <TableCell>{ordem.estimativaHoras ?? "-"}</TableCell>
                        <TableCell>{ordem.valorTotalEstimado != null ? moeda.format(ordem.valorTotalEstimado) : "-"}</TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal text-muted-foreground">
                          {ordem.descricaoFinalizacao || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
