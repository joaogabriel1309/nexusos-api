"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, FileSpreadsheet, FileText, Plus, RefreshCcw, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoForm } from "@/components/shared/ordem-servico-form";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels, statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
import { useAuth } from "@/providers/auth-provider";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
import { clienteService } from "@/services/cliente-service";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { projetoService } from "@/services/projeto-service";
import { usuarioService } from "@/services/usuario-service";
import type { OrdemServico, StatusOS } from "@/types";

const ordensQueryKey = ["ordens-servico"];
const clientesQueryKey = ["clientes"];
const projetosQueryKey = ["projetos"];
const usuariosQueryKey = ["usuarios"];
const todosOption = "__todos__";
const statusFiltroOptions = statusOptions.filter((status) => status !== "FINALIZADA");
const todosClientesOption = "__todos_clientes__";
const todosProjetosOption = "__todos_projetos__";
const itensPorPagina = 20;
const csvSeparador = ";";

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
            <TableHead>OS</TableHead>
            <TableHead>Cliente / Projeto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const isDesenvolvedor = usuario?.perfil === "DESENVOLVEDOR";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [busca, setBusca] = useState(searchParams.get("busca") ?? "");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

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
  const responsaveis = useMemo(
    () => (usuariosQuery.data ?? []).filter((usuario) => usuario.ativo),
    [usuariosQuery.data]
  );

  const ordensFiltradas = useMemo(() => {
    const termoBusca = normalizarBusca(busca);

    return (ordensQuery.data ?? [])
      .filter((ordem) => {
        if (ordem.status === "FINALIZADA") {
          return false;
        }

        const prazo = ordem.prazo ? new Date(`${ordem.prazo}T00:00:00`) : null;
        const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
        const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

        const matchCliente = clienteFiltro ? ordem.clienteId === clienteFiltro : true;
        const matchProjeto = projetoFiltro ? ordem.projetoId === projetoFiltro : true;
        const matchStatus = statusFiltro ? ordem.status === statusFiltro : true;
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

        return matchCliente && matchProjeto && matchStatus && matchInicio && matchFim && matchBusca;
      })
      .sort((a, b) => b.codigo - a.codigo); // Ordena por código da OS do maior para o menor
  }, [busca, clienteFiltro, dataFim, dataInicio, ordensQuery.data, projetoFiltro, statusFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(ordensFiltradas.length / itensPorPagina));
  const ordensPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return ordensFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [ordensFiltradas, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, clienteFiltro, dataFim, dataInicio, projetoFiltro, statusFiltro]);

  useEffect(() => {
    setBusca(searchParams.get("busca") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  const salvarMutation = useMutation({
    mutationFn: (data: OrdemServicoFormData) => {
      if (ordemSelecionada) {
        return ordemServicoService.atualizar(ordemSelecionada.id, {
          ...data,
          entendimento: ordemSelecionada.entendimento,
          impacto: ordemSelecionada.impacto,
          riscos: ordemSelecionada.riscos,
          estimativaHoras: ordemSelecionada.estimativaHoras ?? null
        });
      }

      return ordemServicoService.criar(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      setDialogOpen(false);
      setOrdemSelecionada(null);
      toast.success(ordemSelecionada ? "OS atualizada com sucesso." : "OS cadastrada com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel salvar a OS.");
    }
  });

  const isLoading =
    ordensQuery.isLoading || (!isDesenvolvedor && (clientesQuery.isLoading || projetosQuery.isLoading || usuariosQuery.isLoading));
  const isError =
    ordensQuery.isError || (!isDesenvolvedor && (clientesQuery.isError || projetosQuery.isError || usuariosQuery.isError));

  function abrirCadastro() {
    if (isDesenvolvedor) {
      return;
    }

    setOrdemSelecionada(null);
    setDialogOpen(true);
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
    setDataInicio("");
    setDataFim("");
  }

  function exportarExcel() {
    const cabecalho = ["OS", "Titulo", "Cliente", "Projeto", "Responsavel", "Status", "Prioridade", "Prazo", "Pagamento"];
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
      toast.error("Nao foi possivel abrir a janela de impressao.");
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
          <title>Ordens de Servico</title>
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
          <h1>Ordens de Servico</h1>
          <p>${ordensFiltradas.length} OS exportada(s) em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}</p>
          <table>
            <thead>
              <tr>
                <th>OS</th>
                <th>Titulo</th>
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
        title="Ordens de Serviço"
        description="Acompanhe demandas técnicas por status, prioridade e responsável."
        actions={
          !isDesenvolvedor ? (
            <Button onClick={abrirCadastro} disabled={clientes.length === 0 || isLoading}>
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por OS, titulo, cliente, responsavel..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportarPdf} disabled={isLoading || ordensFiltradas.length === 0}>
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" onClick={exportarExcel} disabled={isLoading || ordensFiltradas.length === 0}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" onClick={recarregar} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(160px,1fr)_150px_150px_auto]">
            <Select
              value={clienteFiltro || todosClientesOption}
              onValueChange={(value) => setClienteFiltro(value === todosClientesOption ? "" : value)}
            >
              <SelectTrigger>
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
              <SelectTrigger>
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
            <Select value={statusFiltro || todosOption} onValueChange={(value) => setStatusFiltro(value === todosOption ? "" : (value as StatusOS))}>
              <SelectTrigger>
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
            <Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
            <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
            <Button variant="outline" onClick={limparFiltros} className="w-full sm:w-auto">
              Limpar
            </Button>
          </div>

          {isLoading ? (
            <OrdensTableSkeleton />
          ) : isError ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nao foi possivel carregar as ordens de servico.</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : ordensFiltradas.length === 0 ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nenhuma OS encontrada.</span>
              {!isDesenvolvedor ? (
                <Button variant="outline" size="sm" onClick={abrirCadastro} disabled={clientes.length === 0}>
                  <Plus className="h-4 w-4" />
                  Cadastrar OS
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-0">OS</TableHead>
                    <TableHead>Cliente / Projeto</TableHead>
                    <TableHead className="w-[190px]">Status</TableHead>
                    <TableHead className="w-[140px]">Pagamento</TableHead>
                    <TableHead className="w-[160px]">Prazo</TableHead>
                    <TableHead className="w-[120px] text-right">Acoes</TableHead>
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
                              title="Editar OS"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOrdemSelecionada(ordem);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar OS</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && !isError && ordensFiltradas.length > 0 ? (
            <TablePagination
              page={paginaAtual}
              totalItems={ordensFiltradas.length}
              pageSize={itensPorPagina}
              onPageChange={setPaginaAtual}
            />
          ) : null}
        </CardContent>
      </Card>

      {!isDesenvolvedor ? (
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setOrdemSelecionada(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{ordemSelecionada ? "Editar OS" : "Cadastrar OS"}</DialogTitle>
              <DialogDescription>
                {ordemSelecionada ? "Atualize os dados principais da ordem de servico." : "Registre a demanda inicial para analise técnica."}
              </DialogDescription>
            </DialogHeader>
            <OrdemServicoForm
              clientes={clientes}
              responsaveis={responsaveis}
              projetos={projetos}
              ordem={ordemSelecionada}
              isSubmitting={salvarMutation.isPending}
              onSubmit={(data) => salvarMutation.mutate(data)}
            />
          </DialogContent>
        </Dialog>
      ) : null}

    </AppShell>
  );
}

export default function OrdensServicoPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageHeader
            title="Ordens de Serviço"
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
