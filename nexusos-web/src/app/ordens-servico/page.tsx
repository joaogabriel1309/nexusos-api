"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowRight, CalendarClock, Columns3, Edit, Eye, FileSpreadsheet, FileText, Filter, List, MessageSquare, MoreHorizontal, Plus, RefreshCcw, Search, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels, prioridadeOptions, statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
import { useAuth } from "@/providers/auth-provider";
import { clienteService } from "@/services/cliente-service";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { projetoService } from "@/services/projeto-service";
import { usuarioService } from "@/services/usuario-service";
import type { OrdemServico, PrioridadeOS, StatusOS } from "@/types";

const ordensQueryKey = ["ordens-servico"];
const clientesQueryKey = ["clientes"];
const projetosQueryKey = ["projetos"];
const usuariosQueryKey = ["usuarios"];
const todosOption = "__todos__";
type StatusFiltro = Exclude<StatusOS, "FINALIZADA">;
const statusFiltroOptions = statusOptions.filter((status) => status !== "FINALIZADA") as StatusFiltro[];
const todosClientesOption = "__todos_clientes__";
const todosProjetosOption = "__todos_projetos__";
const todosResponsaveisOption = "__todos_responsaveis__";
const semResponsavelOption = "sem-responsavel";
const itensPorPagina = 20;
const csvSeparador = ";";
const kanbanStatuses: StatusOS[] = [
  "RECEBIDA", "EM_ANALISE", "AGUARDANDO_APROVACAO", "APROVADA",
  "EM_DESENVOLVIMENTO", "EM_TESTE", "AGUARDANDO_PAGAMENTO", "FINALIZADA"
];
type OrdenacaoKanban = "fila" | "prioridade" | "prazo";
const pesoPrioridade: Record<PrioridadeOS, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

type PrazoFiltro = "" | "vencidas" | "hoje" | "proximas" | "sem-prazo";

const prazoFiltroLabels: Record<Exclude<PrazoFiltro, "">, string> = {
  vencidas: "tickets vencidos",
  hoje: "Vencem hoje",
  proximas: "Prazo próximo",
  "sem-prazo": "Sem prazo"
};

function isStatusFiltro(value: string | null): value is StatusFiltro {
  return statusFiltroOptions.includes(value as StatusFiltro);
}

function isPrioridadeFiltro(value: string | null): value is PrioridadeOS {
  return prioridadeOptions.includes(value as PrioridadeOS);
}

function isPrazoFiltro(value: string | null): value is Exclude<PrazoFiltro, ""> {
  return value === "vencidas" || value === "hoje" || value === "proximas" || value === "sem-prazo";
}

function PagamentoBadge({ paga }: { paga?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        paga
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
      }
    >
      {paga ? "Paga" : "Pendente"}
    </Badge>
  );
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

function OrdensTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Cliente / Projeto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-5 w-52" />
                <Skeleton className="mt-2 h-4 w-72" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-7 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-7 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-7 w-28" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-9 w-9" />
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

function OrdensServicoPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { usuario } = useAuth();
  const isDesenvolvedor = usuario?.perfil === "DESENVOLVEDOR";
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro | "">("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<PrioridadeOS | "">("");
  const [prazoFiltro, setPrazoFiltro] = useState<PrazoFiltro>("");
  const [responsavelFiltro, setResponsavelFiltro] = useState("");
  const [busca, setBusca] = useState(searchParams.get("busca") ?? "");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [visao, setVisao] = useState<"lista" | "kanban">("lista");
  const [ordenacaoKanban, setOrdenacaoKanban] = useState<OrdenacaoKanban>("fila");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const ordensQuery = useQuery({
    queryKey: ordensQueryKey,
    queryFn: ordemServicoService.listar
  });

  const clientesQuery = useQuery({
    queryKey: clientesQueryKey,
    queryFn: clienteService.listar,
    enabled: !isDesenvolvedor
  });

  const projetosQuery = useQuery({
    queryKey: projetosQueryKey,
    queryFn: projetoService.listar,
    enabled: !isDesenvolvedor
  });

  const usuariosQuery = useQuery({
    queryKey: usuariosQueryKey,
    queryFn: usuarioService.listar,
    enabled: !isDesenvolvedor
  });

  const clientes = useMemo(() => (clientesQuery.data ?? []).filter((cliente) => cliente.ativo), [clientesQuery.data]);
  const clientesFiltroOptions = useMemo(() => {
    if (!isDesenvolvedor) {
      return clientes;
    }

    return Array.from(new Map((ordensQuery.data ?? []).map((ordem) => [ordem.clienteId, ordem.clienteNome])).entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientes, isDesenvolvedor, ordensQuery.data]);
  const projetos = useMemo(() => (projetosQuery.data ?? []).filter((projeto) => projeto.ativo), [projetosQuery.data]);
  const projetosFiltroOptions = useMemo(() => {
    if (!isDesenvolvedor) {
      return projetos;
    }

    return Array.from(
      new Map(
        (ordensQuery.data ?? [])
          .filter((ordem) => ordem.projetoId && ordem.projetoNome)
          .map((ordem) => [ordem.projetoId as string, ordem.projetoNome as string])
      ).entries()
    )
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [isDesenvolvedor, ordensQuery.data, projetos]);
  const usuariosFiltroOptions = useMemo(() => {
    if (!isDesenvolvedor) {
      return (usuariosQuery.data ?? []).filter((item) => item.ativo);
    }

    return Array.from(
      new Map(
        (ordensQuery.data ?? [])
          .filter((ordem) => ordem.responsavelId && ordem.responsavelNome)
          .map((ordem) => [ordem.responsavelId as string, ordem.responsavelNome as string])
      ).entries()
    )
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [isDesenvolvedor, ordensQuery.data, usuariosQuery.data]);
  const ordensFiltradas = useMemo(() => {
    const termoBusca = normalizarBusca(busca);
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
    const limiteProximo = new Date(inicioHoje);
    limiteProximo.setDate(limiteProximo.getDate() + 3);

    return (ordensQuery.data ?? [])
      .filter((ordem) => {
        if (visao === "lista" && ordem.status === "FINALIZADA") {
          return false;
        }

        const prazo = ordem.prazo ? new Date(`${ordem.prazo}T00:00:00`) : null;
        const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
        const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

        const matchCliente = clienteFiltro ? ordem.clienteId === clienteFiltro : true;
        const matchProjeto = projetoFiltro ? ordem.projetoId === projetoFiltro : true;
        const matchStatus = statusFiltro ? ordem.status === statusFiltro : true;
        const matchPrioridade = prioridadeFiltro ? ordem.prioridade === prioridadeFiltro : true;
        const matchResponsavel = responsavelFiltro
          ? responsavelFiltro === semResponsavelOption
            ? !ordem.responsavelId
            : ordem.responsavelId === responsavelFiltro
          : true;
        const matchPrazo =
          prazoFiltro === "vencidas"
            ? prazo
              ? prazo < inicioHoje
              : false
            : prazoFiltro === "hoje"
              ? prazo
                ? prazo >= inicioHoje && prazo <= fimHoje
                : false
              : prazoFiltro === "proximas"
                ? prazo
                  ? prazo > fimHoje && prazo <= limiteProximo
                  : false
                : prazoFiltro === "sem-prazo"
                  ? !prazo
                  : true;
        const matchInicio = inicio && prazo ? prazo >= inicio : true;
        const matchFim = fim && prazo ? prazo <= fim : true;
        const matchBusca = termoBusca
          ? [
              ordem.codigo,
              ordem.titulo,
              ordem.descricao,
              ordem.clienteNome,
              ordem.projetoNome,
              ordem.responsavelNome,
              statusLabels[ordem.status],
              prioridadeLabels[ordem.prioridade]
            ].some((valor) => normalizarBusca(valor).includes(termoBusca))
          : true;

        return (
          matchCliente &&
          matchProjeto &&
          matchStatus &&
          matchPrioridade &&
          matchResponsavel &&
          matchPrazo &&
          matchInicio &&
          matchFim &&
          matchBusca
        );
      })
      .sort((a, b) => b.codigo - a.codigo); // Ordena por código do ticket do maior para o menor
  }, [
    busca,
    clienteFiltro,
    dataFim,
    dataInicio,
    ordensQuery.data,
    prazoFiltro,
    prioridadeFiltro,
    projetoFiltro,
    responsavelFiltro,
    statusFiltro,
    visao
  ]);
  const totalPaginas = Math.max(1, Math.ceil(ordensFiltradas.length / itensPorPagina));
  const ordensPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return ordensFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [ordensFiltradas, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, clienteFiltro, dataFim, dataInicio, prazoFiltro, prioridadeFiltro, projetoFiltro, responsavelFiltro, statusFiltro]);

  useEffect(() => {
    setBusca(searchParams.get("busca") ?? "");
    setClienteFiltro(searchParams.get("cliente") ?? "");
    setProjetoFiltro(searchParams.get("projeto") ?? "");
    setStatusFiltro(isStatusFiltro(searchParams.get("status")) ? (searchParams.get("status") as StatusFiltro) : "");
    setPrioridadeFiltro(isPrioridadeFiltro(searchParams.get("prioridade")) ? (searchParams.get("prioridade") as PrioridadeOS) : "");
    setPrazoFiltro(isPrazoFiltro(searchParams.get("prazo")) ? (searchParams.get("prazo") as Exclude<PrazoFiltro, "">) : "");
    setResponsavelFiltro(searchParams.get("responsavel") ?? "");
    setDataInicio(searchParams.get("inicio") ?? "");
    setDataFim(searchParams.get("fim") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  const isLoading =
    ordensQuery.isLoading || (!isDesenvolvedor && (clientesQuery.isLoading || projetosQuery.isLoading || usuariosQuery.isLoading));
  const isError =
    ordensQuery.isError || (!isDesenvolvedor && (clientesQuery.isError || projetosQuery.isError || usuariosQuery.isError));

  function abrirCadastro() {
    if (isDesenvolvedor) {
      return;
    }

    router.push("/ordens-servico/nova");
  }

  function recarregar() {
    ordensQuery.refetch();
    if (!isDesenvolvedor) {
      clientesQuery.refetch();
      projetosQuery.refetch();
      usuariosQuery.refetch();
    }
  }

  function limparFiltros() {
    setBusca("");
    setClienteFiltro("");
    setProjetoFiltro("");
    setStatusFiltro("");
    setPrioridadeFiltro("");
    setPrazoFiltro("");
    setResponsavelFiltro("");
    setDataInicio("");
    setDataFim("");
    router.replace("/ordens-servico");
  }

  const statusMutation = useMutation({
    mutationFn: ({ ordem, status }: { ordem: OrdemServico; status: StatusOS }) =>
      ordemServicoService.atualizarStatus(ordem.id, status),
    onSuccess: (ordemAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success(`Ticket ${ordemAtualizada.codigo} movido para ${statusLabels[ordemAtualizada.status]}.`);
    },
    onError: () => toast.error("Não foi possível alterar o status do ticket.")
  });

  const assumirMutation = useMutation({
    mutationFn: (ordem: OrdemServico) => ordemServicoService.assumir(ordem.id),
    onSuccess: (ordem) => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success(`Você assumiu o ticket ${ordem.codigo}.`);
    },
    onError: () => toast.error("Não foi possível assumir este ticket.")
  });

  function moverOrdem(ordem: OrdemServico, destino: StatusOS) {
    if (destino === "FINALIZADA") {
      router.push(`/ordens-servico/${ordem.id}/finalizar`);
    } else {
      statusMutation.mutate({ ordem, status: destino });
    }
  }

  const filtrosAtivos = [
    busca ? `Busca: ${busca}` : null,
    clienteFiltro ? "Cliente filtrado" : null,
    projetoFiltro ? "Projeto filtrado" : null,
    statusFiltro ? `Status: ${statusLabels[statusFiltro]}` : null,
    prioridadeFiltro ? `Prioridade: ${prioridadeLabels[prioridadeFiltro]}` : null,
    prazoFiltro ? prazoFiltroLabels[prazoFiltro] : null,
    responsavelFiltro
      ? responsavelFiltro === semResponsavelOption
        ? "Sem responsável"
        : "Responsável filtrado"
      : null,
    dataInicio ? `Inicio: ${formatarDataPrazo(dataInicio)}` : null,
    dataFim ? `Fim: ${formatarDataPrazo(dataFim)}` : null
  ].filter((filtro): filtro is string => Boolean(filtro));

  function exportarExcel() {
    const cabecalho = ["ticket", "Título", "Cliente", "Projeto", "Responsável", "Status", "Prioridade", "Prazo", "Pagamento"];
    const linhas = ordensFiltradas.map((ordem) =>
      [
        ordem.codigo,
        ordem.titulo,
        ordem.clienteNome,
        ordem.projetoNome || "Sem projeto",
        ordem.responsavelNome || "A definir",
        statusLabels[ordem.status],
        prioridadeLabels[ordem.prioridade],
        formatarDataPrazo(ordem.prazo),
        ordem.paga ? "Paga" : "Pendente"
      ]
        .map(escaparCsv)
        .join(csvSeparador)
    );

    baixarArquivo(
      `ordens-servico-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${cabecalho.map(escaparCsv).join(csvSeparador)}\n${linhas.join("\n")}`,
      "text/csv;charset=utf-8"
    );
  }

  function exportarPdf() {
    const janela = window.open("", "_blank");

    if (!janela) {
      toast.error("Não foi possível abrir a janela de impressão.");
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
            <td>${statusLabels[ordem.status]}</td>
            <td>${prioridadeLabels[ordem.prioridade]}</td>
            <td>${formatarDataPrazo(ordem.prazo)}</td>
          </tr>`
      )
      .join("");

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Tickets</title>
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
          <h1>Tickets</h1>
          <p>${ordensFiltradas.length} ticket exportado(s) em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}</p>
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Título</th>
                <th>Cliente</th>
                <th>Projeto</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Prazo</th>
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
        title="Tickets"
        description="Acompanhe demandas técnicas por status, prioridade e responsável."
        actions={
          !isDesenvolvedor ? (
            <Button onClick={abrirCadastro} disabled={clientes.length === 0 || isLoading}>
              <Plus className="h-4 w-4" />
              Novo ticket
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar tickets"
                className="pl-9"
                placeholder="Buscar por número, título, cliente ou responsável"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border p-0.5" aria-label="Modo de visualização">
                <Button variant={visao === "lista" ? "secondary" : "ghost"} size="sm" onClick={() => setVisao("lista")}>
                  <List className="h-4 w-4" /> Lista
                </Button>
                <Button variant={visao === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setVisao("kanban")}>
                  <Columns3 className="h-4 w-4" /> Kanban
                </Button>
              </div>
              <Button
                variant={filtrosAbertos ? "secondary" : "outline"}
                onClick={() => setFiltrosAbertos((aberto) => !aberto)}
                aria-expanded={filtrosAbertos}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {filtrosAtivos.length > 0 ? <Badge className="ml-1">{filtrosAtivos.length}</Badge> : null}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Mais ações"><MoreHorizontal className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => router.push("/ordens-servico/finalizadas")}>
                    <Archive className="mr-2 h-4 w-4" /> Tickets finalizados
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={recarregar} disabled={isLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Atualizar dados
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={exportarPdf} disabled={isLoading || ordensFiltradas.length === 0}>
                    <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={exportarExcel} disabled={isLoading || ordensFiltradas.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtros rápidos">
            <span className="mr-1 text-sm text-muted-foreground">Ver:</span>
            <Button size="sm" variant={prazoFiltro === "vencidas" ? "secondary" : "outline"} onClick={() => setPrazoFiltro((atual) => atual === "vencidas" ? "" : "vencidas")}>
              Vencidos
            </Button>
            <Button size="sm" variant={prazoFiltro === "hoje" ? "secondary" : "outline"} onClick={() => setPrazoFiltro((atual) => atual === "hoje" ? "" : "hoje")}>
              Vencem hoje
            </Button>
            {!isDesenvolvedor ? (
              <Button size="sm" variant={responsavelFiltro === semResponsavelOption ? "secondary" : "outline"} onClick={() => setResponsavelFiltro((atual) => atual === semResponsavelOption ? "" : semResponsavelOption)}>
                Sem responsável
              </Button>
            ) : null}
            {filtrosAtivos.length > 0 ? <Button size="sm" variant="ghost" onClick={limparFiltros}>Limpar filtros</Button> : null}
          </div>

          {filtrosAbertos ? <div className="mb-4 rounded-md border bg-secondary/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select
              value={clienteFiltro || todosClientesOption}
              onValueChange={(value) => setClienteFiltro(value === todosClientesOption ? "" : value)}
            >
              <SelectTrigger aria-label="Filtrar por cliente">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todosClientesOption}>Todos os clientes</SelectItem>
                {clientesFiltroOptions.map((cliente) => (
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
              <SelectTrigger aria-label="Filtrar por projeto">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todosProjetosOption}>Todos os projetos</SelectItem>
                {projetosFiltroOptions.map((projeto) => (
                  <SelectItem key={projeto.id} value={projeto.id}>
                    {projeto.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFiltro || todosOption} onValueChange={(value) => setStatusFiltro(value === todosOption ? "" : (value as StatusFiltro))}>
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todosOption}>Todos os status</SelectItem>
                {statusFiltroOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={prioridadeFiltro || todosOption}
              onValueChange={(value) => setPrioridadeFiltro(value === todosOption ? "" : (value as PrioridadeOS))}
            >
              <SelectTrigger aria-label="Filtrar por prioridade">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todosOption}>Todas as prioridades</SelectItem>
                {prioridadeOptions.map((prioridade) => (
                  <SelectItem key={prioridade} value={prioridade}>
                    {prioridadeLabels[prioridade]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={prazoFiltro || todosOption} onValueChange={(value) => setPrazoFiltro(value === todosOption ? "" : (value as PrazoFiltro))}>
              <SelectTrigger aria-label="Filtrar por prazo">
                <SelectValue placeholder="Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todosOption}>Todos os prazos</SelectItem>
                <SelectItem value="vencidas">tickets vencidos</SelectItem>
                <SelectItem value="hoje">Vencem hoje</SelectItem>
                <SelectItem value="proximas">Prazo próximo</SelectItem>
                <SelectItem value="sem-prazo">Sem prazo</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={responsavelFiltro || todosResponsaveisOption}
              onValueChange={(value) => setResponsavelFiltro(value === todosResponsaveisOption ? "" : value)}
            >
              <SelectTrigger aria-label="Filtrar por responsável">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={todosResponsaveisOption}>Todos os responsaveis</SelectItem>
                <SelectItem value={semResponsavelOption}>Sem responsável</SelectItem>
                {usuariosFiltroOptions.map((responsavel) => (
                  <SelectItem key={responsavel.id} value={responsavel.id}>
                    {responsavel.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input aria-label="Data inicial" type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
            <Input aria-label="Data final" type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
          </div>
          </div> : null}

          {filtrosAtivos.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
              <span className="text-muted-foreground">Filtros aplicados:</span>
              {filtrosAtivos.map((filtro) => (
                <Badge key={filtro} variant="outline">
                  {filtro}
                </Badge>
              ))}
            </div>
          ) : null}

          {isLoading ? (
            <OrdensTableSkeleton />
          ) : isError ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Não foi possível carregar os tickets.</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : ordensFiltradas.length === 0 ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nenhum ticket encontrado.</span>
              {!isDesenvolvedor ? (
                <Button variant="outline" size="sm" onClick={abrirCadastro} disabled={clientes.length === 0}>
                  <Plus className="h-4 w-4" />
                  Cadastrar ticket
                </Button>
              ) : null}
            </div>
          ) : (
            visao === "kanban" ? (
              <div>
                <div className="mb-3 flex items-center justify-end gap-2">
                  <span className="text-sm text-muted-foreground">Ordenar por</span>
                  <Select value={ordenacaoKanban} onValueChange={(value) => setOrdenacaoKanban(value as OrdenacaoKanban)}>
                    <SelectTrigger aria-label="Ordenar Kanban por" className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fila">Fila de trabalho</SelectItem>
                      <SelectItem value="prioridade">Prioridade</SelectItem>
                      <SelectItem value="prazo">Prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div className="overflow-x-auto pb-3">
                <div className="flex min-w-max gap-4" aria-label="Kanban de tickets">
                  {kanbanStatuses.map((status) => {
                    const ordensDaColuna = ordensFiltradas.filter((ordem) => ordem.status === status).sort((a, b) => {
                      if (ordenacaoKanban === "prioridade") return pesoPrioridade[a.prioridade] - pesoPrioridade[b.prioridade];
                      if (ordenacaoKanban === "prazo") return (a.prazo ?? "9999-12-31").localeCompare(b.prazo ?? "9999-12-31");
                      return (a.sequenciaExecucao ?? Number.MAX_SAFE_INTEGER) - (b.sequenciaExecucao ?? Number.MAX_SAFE_INTEGER);
                    });
                    const hoje = new Date().toISOString().slice(0, 10);
                    const vencidas = ordensDaColuna.filter((ordem) => ordem.prazo && ordem.prazo < hoje).length;
                    return (
                      <section
                        key={status}
                        className="w-72 shrink-0 rounded-lg border bg-muted/30 p-3"
                      >
                        <header className="sticky top-0 z-10 -mx-1 mb-3 flex items-center justify-between gap-2 rounded-md bg-muted p-2 shadow-sm">
                          <span className="text-sm font-semibold">{statusLabels[status]}</span>
                          <div className="flex gap-1"><Badge variant="secondary">{ordensDaColuna.length}</Badge>{vencidas > 0 ? <Badge variant="danger">{vencidas} vencida(s)</Badge> : null}</div>
                        </header>
                        <div className="space-y-3">
                          {ordensDaColuna.length === 0 ? (
                            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                              Nenhum ticket nesta etapa.
                            </div>
                          ) : ordensDaColuna.map((ordem) => (
                            <article
                              key={ordem.id}
                              onClick={() => router.push(`/ordens-servico/${ordem.id}`)}
                              className="cursor-pointer rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md"
                            >
                              <div className="font-medium">Ticket {ordem.codigo}</div>
                              <div className="mt-1 line-clamp-2 text-sm">{ordem.titulo}</div>
                              <div className="mt-3 space-y-1 text-xs text-muted-foreground"><div className="truncate">Cliente: {ordem.clienteNome}</div><div className="truncate">Responsável: {ordem.responsavelNome ?? "Sem responsável"}</div></div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{prioridadeLabels[ordem.prioridade]}</Badge>
                                <span className={`rounded border px-1.5 py-0.5 text-xs ${prazoClasses(ordem.prazo)}`}>{formatarDataPrazo(ordem.prazo)}</span>
                                {!ordem.responsavelId ? <Badge variant="danger">Sem responsável</Badge> : null}
                                {ordem.status === "AGUARDANDO_APROVACAO" ? <Badge variant="secondary">Aguardando cliente</Badge> : null}
                                {ordem.status === "AGUARDANDO_PAGAMENTO" ? <Badge variant="secondary">Aguardando pagamento</Badge> : null}
                                {ordem.transicoesStatus?.some((item) => item.motivoBloqueio?.includes("administrador")) ? <Badge variant="danger">Aprovação do admin</Badge> : null}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-1 border-t pt-2" onClick={(event) => event.stopPropagation()}>
                                <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => router.push(`/ordens-servico/${ordem.id}`)}><Eye className="h-4 w-4" /><span className="sr-only">Ver detalhes</span></Button>
                                <Button variant="ghost" size="icon" title="Comentar" onClick={() => router.push(`/ordens-servico/${ordem.id}#comentarios`)}><MessageSquare className="h-4 w-4" /><span className="sr-only">Comentar</span></Button>
                                {!ordem.responsavelId ? <Button variant="ghost" size="icon" title="Assumir ticket" disabled={assumirMutation.isPending} onClick={() => assumirMutation.mutate(ordem)}><UserRound className="h-4 w-4" /><span className="sr-only">Assumir ticket</span></Button> : null}
                                {!isDesenvolvedor ? <Button variant="ghost" size="icon" title="Alterar responsável" onClick={() => router.push(`/ordens-servico/${ordem.id}/editar`)}><UserRound className="h-4 w-4" /><span className="sr-only">Alterar responsável</span></Button> : null}
                                {!isDesenvolvedor ? <Button variant="ghost" size="icon" title="Definir prazo" onClick={() => router.push(`/ordens-servico/${ordem.id}/editar`)}><CalendarClock className="h-4 w-4" /><span className="sr-only">Definir prazo</span></Button> : null}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="ml-auto"><ArrowRight className="h-4 w-4" />Ações</Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {ordem.status === "RECEBIDA" || ordem.status === "EM_ANALISE" ? (
                                      <DropdownMenuItem onSelect={() => router.push(`/ordens-servico/${ordem.id}/analise`)}>
                                        {ordem.status === "RECEBIDA" ? "Fazer análise" : "Revisar análise"}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {ordem.transicoesStatus
                                      ?.filter((item) => item.permitida
                                        && !(ordem.status === "RECEBIDA" && item.status === "EM_ANALISE")
                                        && !(ordem.status === "EM_ANALISE" && item.status === "AGUARDANDO_APROVACAO"))
                                      .map((item) => (
                                        <DropdownMenuItem key={item.status} onSelect={() => moverOrdem(ordem, item.status)}>
                                          {statusLabels[item.status]}
                                        </DropdownMenuItem>
                                      ))}
                                    {!ordem.transicoesStatus?.some((item) => item.permitida) && ordem.status !== "EM_ANALISE" ? (
                                      <DropdownMenuItem disabled>Nenhuma ação disponível</DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
              </div>
            ) : <>
              <div className="grid gap-3 md:hidden">
                {ordensPaginadas.map((ordem) => (
                  <div
                    key={ordem.id}
                    role="button"
                    tabIndex={0}
                    className="min-w-0 max-w-full overflow-hidden rounded-md border bg-background p-4 text-left shadow-sm transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => router.push(`/ordens-servico/${ordem.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/ordens-servico/${ordem.id}`);
                      }
                    }}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium" title={ordem.titulo}>
                          {ordem.codigo} - {ordem.titulo}
                        </div>
                        <div className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]" title={ordem.descricao}>
                          {ordem.descricao}
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${statusBadgeClasses[ordem.status]}`}>
                        {statusLabels[ordem.status]}
                      </Badge>
                    </div>

                    <div className="mt-4 grid min-w-0 gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase text-muted-foreground">Cliente</div>
                        <div className="truncate" title={ordem.clienteNome}>
                          {ordem.clienteNome}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase text-muted-foreground">Projeto</div>
                        <div className="truncate" title={ordem.projetoNome || "Sem projeto"}>
                          {ordem.projetoNome || "Sem projeto"}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <PagamentoBadge paga={ordem.paga} />
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${prazoClasses(ordem.prazo)}`}>
                          {formatarDataPrazo(ordem.prazo)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/ordens-servico/${ordem.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Detalhes
                      </Button>
                      {!isDesenvolvedor ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/ordens-servico/${ordem.id}/editar`);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-0">ticket</TableHead>
                    <TableHead>Cliente / Projeto</TableHead>
                    <TableHead className="w-[190px]">Status</TableHead>
                    <TableHead className="w-[140px]">Pagamento</TableHead>
                    <TableHead className="w-[160px]">Prazo</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordensPaginadas.map((ordem) => (
                    <TableRow
                      key={ordem.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/ordens-servico/${ordem.id}`)}
                    >
                      <TableCell>
                        <div className="max-w-[420px] min-w-0">
                          <div className="truncate font-medium" title={ordem.titulo}>
                            {ordem.codigo} - {ordem.titulo}
                          </div>
                          <div className="max-w-full truncate text-xs text-muted-foreground" title={ordem.descricao}>
                            {ordem.descricao}
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
                        <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
                          {statusLabels[ordem.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <PagamentoBadge paga={ordem.paga} />
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${prazoClasses(ordem.prazo)}`}>
                          {formatarDataPrazo(ordem.prazo)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver detalhes"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/ordens-servico/${ordem.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalhes</span>
                          </Button>
                          {!isDesenvolvedor ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar ticket"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/ordens-servico/${ordem.id}/editar`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar ticket</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </>
          )}

          {!isLoading && !isError && ordensFiltradas.length > 0 && visao === "lista" ? (
            <TablePagination
              page={paginaAtual}
              totalItems={ordensFiltradas.length}
              pageSize={itensPorPagina}
              onPageChange={setPaginaAtual}
            />
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function OrdensServicoPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageHeader
            title="Tickets"
            description="Acompanhe demandas técnicas por status, prioridade e responsável."
          />
          <Card>
            <CardContent className="p-4 sm:p-5">
              <OrdensTableSkeleton />
            </CardContent>
          </Card>
        </AppShell>
      }
    >
      <OrdensServicoPageContent />
    </Suspense>
  );
}
