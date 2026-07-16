"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, FileSpreadsheet, FileText, RefreshCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels, statusBadgeClasses, statusLabels } from "@/lib/os-labels";
import { useAuth } from "@/providers/auth-provider";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { projetoService } from "@/services/projeto-service";
import type { PrioridadeOS } from "@/types";

const ordensFinalizadasQueryKey = ["ordens-servico", "finalizadas"];
const projetosQueryKey = ["projetos"];
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const todosClientesOption = "__todos__";
const todosProjetosOption = "__todos_projetos__";
const itensPorPagina = 20;
const csvSeparador = ";";

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

function PagamentoBadge({ paga }: { paga?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        paga
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
    >
      {paga ? "Pago" : "A pagar"}
    </Badge>
  );
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

function normalizarBusca(valor?: string | number | null) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escaparCsv(valor?: string | number | boolean | null) {
  return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function escaparHtml(valor?: string | number | null) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FinalizadasTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>OS</TableHead>
            <TableHead>Cliente / Projeto</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Finalizada em</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-2 h-4 w-72" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-7 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-7 w-20" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Skeleton className="h-9 w-9" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function OrdensServicoFinalizadasPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const isDesenvolvedor = usuario?.perfil === "DESENVOLVEDOR";
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const ordensQuery = useQuery({
    queryKey: ordensFinalizadasQueryKey,
    queryFn: ordemServicoService.listar,
    select: (ordens) => ordens.filter((ordem) => ordem.status === "FINALIZADA")
  });

  const projetosQuery = useQuery({
    queryKey: projetosQueryKey,
    queryFn: projetoService.listar,
    enabled: !isDesenvolvedor
  });

  const ordens = useMemo(() => ordensQuery.data ?? [], [ordensQuery.data]);
  const projetos = useMemo(() => {
    if (!isDesenvolvedor) {
      return (projetosQuery.data ?? []).filter((projeto) => projeto.ativo);
    }

    return Array.from(
      new Map(
        ordens
          .filter((ordem) => ordem.projetoId && ordem.projetoNome)
          .map((ordem) => [ordem.projetoId as string, ordem.projetoNome as string])
      ).entries()
    )
      .map(([id, nome]) => ({ id, nome, ativo: true }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [isDesenvolvedor, ordens, projetosQuery.data]);
  const clientes = useMemo(() => {
    return Array.from(new Map(ordens.map((ordem) => [ordem.clienteId, ordem.clienteNome])).entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [ordens]);

  const ordensFiltradas = useMemo(() => {
    const termoBusca = normalizarBusca(busca);

    return ordens
      .filter((ordem) => {
        const finalizadoEm = ordem.finalizadoEm ? new Date(ordem.finalizadoEm) : null;
        const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
        const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

        const matchCliente = clienteFiltro ? ordem.clienteId === clienteFiltro : true;
        const matchProjeto = projetoFiltro ? ordem.projetoId === projetoFiltro : true;
        const matchInicio = inicio && finalizadoEm ? finalizadoEm >= inicio : true;
        const matchFim = fim && finalizadoEm ? finalizadoEm <= fim : true;
        const matchBusca = termoBusca
          ? [
              ordem.codigo,
              ordem.titulo,
              ordem.descricao,
              ordem.clienteNome,
              ordem.projetoNome,
              ordem.responsavelNome,
              ordem.descricaoFinalizacao,
              prioridadeLabels[ordem.prioridade]
            ].some((valor) => normalizarBusca(valor).includes(termoBusca))
          : true;

        return matchCliente && matchProjeto && matchInicio && matchFim && matchBusca;
      })
      .sort((a, b) => {
        const dataA = a.finalizadoEm ? new Date(a.finalizadoEm).getTime() : 0;
        const dataB = b.finalizadoEm ? new Date(b.finalizadoEm).getTime() : 0;
        return dataB - dataA || b.codigo - a.codigo;
      });
  }, [busca, clienteFiltro, dataFim, dataInicio, ordens, projetoFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(ordensFiltradas.length / itensPorPagina));
  const ordensPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return ordensFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [ordensFiltradas, paginaAtual]);

  const totalValor = useMemo(() => {
    return ordensFiltradas.reduce((total, ordem) => total + (ordem.paga ? ordem.valorTotalEstimado ?? 0 : 0), 0);
  }, [ordensFiltradas]);
  const totalHoras = useMemo(() => {
    return ordensFiltradas.reduce((total, ordem) => total + (ordem.estimativaHoras ?? 0), 0);
  }, [ordensFiltradas]);
  const totalPendentesPagamento = useMemo(() => {
    return ordensFiltradas.filter((ordem) => !ordem.paga && ordem.cobrar !== false).length;
  }, [ordensFiltradas]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, clienteFiltro, dataFim, dataInicio, projetoFiltro]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  function limparFiltros() {
    setBusca("");
    setClienteFiltro("");
    setProjetoFiltro("");
    setDataInicio("");
    setDataFim("");
  }

  function recarregar() {
    ordensQuery.refetch();
    if (!isDesenvolvedor) {
      projetosQuery.refetch();
    }
  }

  function exportarExcel() {
    const cabecalho = [
      "OS",
      "Título",
      "Cliente",
      "Projeto",
      "Responsável",
      "Prioridade",
      "Finalizada em",
      "Horas",
      "Valor",
      "Pagamento",
      "O que foi feito"
    ];
    const linhas = ordensFiltradas.map((ordem) =>
      [
        ordem.codigo,
        ordem.titulo,
        ordem.clienteNome,
        ordem.projetoNome || "Sem projeto",
        ordem.responsavelNome || "A definir",
        prioridadeLabels[ordem.prioridade],
        formatarDataHora(ordem.finalizadoEm),
        ordem.estimativaHoras ?? "",
        ordem.valorTotalEstimado != null ? moeda.format(ordem.valorTotalEstimado) : "",
        ordem.paga ? "Pago" : "A pagar",
        ordem.descricaoFinalizacao || ""
      ]
        .map(escaparCsv)
        .join(csvSeparador)
    );

    baixarArquivo(
      `os-finalizadas-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${cabecalho.map(escaparCsv).join(csvSeparador)}\n${linhas.join("\n")}`,
      "text/csv;charset=utf-8"
    );
  }

  function exportarPdf() {
    const janela = window.open("", "_blank");

    if (!janela) {
      return;
    }

    const linhas = ordensFiltradas
      .map(
        (ordem) => `
          <tr>
            <td>${ordem.codigo}</td>
            <td>${escaparHtml(ordem.titulo)}</td>
            <td>${escaparHtml(ordem.clienteNome)}</td>
            <td>${escaparHtml(ordem.projetoNome || "Sem projeto")}</td>
            <td>${prioridadeLabels[ordem.prioridade]}</td>
            <td>${formatarDataHora(ordem.finalizadoEm)}</td>
            <td>${ordem.valorTotalEstimado != null ? moeda.format(ordem.valorTotalEstimado) : "-"}</td>
            <td>${ordem.paga ? "Pago" : "A pagar"}</td>
          </tr>`
      )
      .join("");

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>OS Finalizadas</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { font-size: 22px; margin: 0 0 4px; }
            p { color: #6b7280; margin: 0 0 24px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>OS Finalizadas</h1>
          <p>${ordensFiltradas.length} OS exportada(s) em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}</p>
          <table>
            <thead>
              <tr>
                <th>OS</th>
                <th>Título</th>
                <th>Cliente</th>
                <th>Projeto</th>
                <th>Prioridade</th>
                <th>Finalizada em</th>
                <th>Valor</th>
                <th>Pagamento</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  return (
    <AppShell>
      <PageHeader
        title="OS Finalizadas"
        description="Consulte ordens encerradas, data de finalização e resumo do que foi feito."
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          {ordensQuery.isLoading ? (
            <FinalizadasTableSkeleton />
          ) : ordensQuery.isError || (!isDesenvolvedor && projetosQuery.isError) ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Não foi possível carregar as OS finalizadas.</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : ordens.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma OS finalizada.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por OS, cliente, responsável, finalização..."
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={exportarPdf} disabled={ordensFiltradas.length === 0}>
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={exportarExcel} disabled={ordensFiltradas.length === 0}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={recarregar}>
                    <RefreshCcw className="h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
              </div>

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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border bg-secondary/40 p-4">
                  <div className="text-sm text-muted-foreground">OS filtradas</div>
                  <div className="mt-1 text-2xl font-semibold">{ordensFiltradas.length}</div>
                </div>
                <div className="rounded-md border bg-secondary/40 p-4">
                  <div className="text-sm text-muted-foreground">Horas encerradas</div>
                  <div className="mt-1 text-2xl font-semibold">{totalHoras.toLocaleString("pt-BR")}h</div>
                </div>
                <div className="rounded-md border bg-secondary/40 p-4">
                  <div className="text-sm text-muted-foreground">Valor pago filtrado</div>
                  <div className="mt-1 text-2xl font-semibold">{moeda.format(totalValor)}</div>
                </div>
                <div className="rounded-md border bg-secondary/40 p-4">
                  <div className="text-sm text-muted-foreground">Aguardando pagamento</div>
                  <div className="mt-1 text-2xl font-semibold">{totalPendentesPagamento}</div>
                </div>
              </div>

              {ordensFiltradas.length === 0 ? (
                <div className="rounded-md border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  Nenhuma OS encontrada para os filtros informados.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {ordensPaginadas.map((ordem) => (
                      <div
                        key={ordem.id}
                        role="button"
                        tabIndex={0}
                        className="min-w-0 max-w-full overflow-hidden rounded-md border bg-background p-4 text-left shadow-sm transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => router.push(`/ordens-servico/${ordem.id}?origem=finalizadas`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/ordens-servico/${ordem.id}?origem=finalizadas`);
                          }
                        }}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium" title={ordem.titulo}>
                              {ordem.codigo} - {ordem.titulo}
                            </div>
                            <div className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                              {ordem.descricaoFinalizacao || ordem.descricao}
                            </div>
                          </div>
                          <Badge variant="outline" className={`shrink-0 ${statusBadgeClasses.FINALIZADA}`}>
                            {statusLabels.FINALIZADA}
                          </Badge>
                        </div>

                        <div className="mt-4 grid min-w-0 gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="text-xs font-medium uppercase text-muted-foreground">Cliente</div>
                            <div className="truncate" title={ordem.clienteNome}>
                              {ordem.clienteNome}
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={ordem.projetoNome || "Sem projeto"}>
                              {ordem.projetoNome || "Sem projeto"}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-medium uppercase text-muted-foreground">Finalizada em</div>
                              <div>{formatarDataHora(ordem.finalizadoEm)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium uppercase text-muted-foreground">Horas</div>
                              <div>{ordem.estimativaHoras != null ? `${ordem.estimativaHoras}h` : "-"}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                            <PagamentoBadge paga={ordem.paga} />
                            <span className="rounded-md border px-2.5 py-1 text-xs font-semibold">
                              {ordem.valorTotalEstimado != null ? moeda.format(ordem.valorTotalEstimado) : "-"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/ordens-servico/${ordem.id}?origem=finalizadas`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Detalhes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Cliente / Projeto</TableHead>
                        <TableHead className="w-[150px]">Prioridade</TableHead>
                        <TableHead className="w-[170px]">Finalizada em</TableHead>
                        <TableHead className="w-[120px]">Horas</TableHead>
                        <TableHead className="w-[140px]">Valor</TableHead>
                        <TableHead className="w-[130px]">Pagamento</TableHead>
                        <TableHead className="w-[90px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordensPaginadas.map((ordem) => (
                        <TableRow
                          key={ordem.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/ordens-servico/${ordem.id}?origem=finalizadas`)}
                        >
                          <TableCell>
                            <div className="max-w-[460px] min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {ordem.codigo} - {ordem.titulo}
                                </span>
                                <Badge variant="outline" className={statusBadgeClasses.FINALIZADA}>
                                  {statusLabels.FINALIZADA}
                                </Badge>
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {ordem.descricaoFinalizacao || ordem.descricao}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[260px] min-w-0">
                              <div className="truncate text-sm" title={ordem.clienteNome}>
                                {ordem.clienteNome}
                              </div>
                              <div className="truncate text-xs text-muted-foreground" title={ordem.projetoNome || "Sem projeto"}>
                                {ordem.projetoNome || "Sem projeto"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                          </TableCell>
                          <TableCell>{formatarDataHora(ordem.finalizadoEm)}</TableCell>
                          <TableCell>{ordem.estimativaHoras != null ? `${ordem.estimativaHoras}h` : "-"}</TableCell>
                          <TableCell>{ordem.valorTotalEstimado != null ? moeda.format(ordem.valorTotalEstimado) : "-"}</TableCell>
                          <TableCell>
                            <PagamentoBadge paga={ordem.paga} />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalhes"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/ordens-servico/${ordem.id}?origem=finalizadas`);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalhes</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {ordensFiltradas.length > 0 ? (
                <TablePagination
                  page={paginaAtual}
                  totalItems={ordensFiltradas.length}
                  pageSize={itensPorPagina}
                  onPageChange={setPaginaAtual}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
