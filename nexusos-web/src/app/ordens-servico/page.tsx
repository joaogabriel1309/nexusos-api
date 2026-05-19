"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Edit, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoAnaliseForm } from "@/components/shared/ordem-servico-analise-form";
import { OrdemServicoForm } from "@/components/shared/ordem-servico-form";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels, statusLabels, statusOptions } from "@/lib/os-labels";
import type { OrdemServicoAnaliseFormData } from "@/schemas/ordem-servico-analise-schema";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
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
const statusFiltroOptions = statusOptions.filter((status) => status !== "FINALIZADA");
const todosClientesOption = "__todos_clientes__";
const todosProjetosOption = "__todos_projetos__";

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

function formatarData(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${data}T00:00:00`));
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarValor(valor?: number) {
  return valor != null ? moeda.format(valor) : "-";
}

export default function OrdensServicoPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analiseDialogOpen, setAnaliseDialogOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);
  const [ordemAnalise, setOrdemAnalise] = useState<OrdemServico | null>(null);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [osEmAcaoId, setOsEmAcaoId] = useState<string | null>(null);

  const ordensQuery = useQuery({
    queryKey: ordensQueryKey,
    queryFn: ordemServicoService.listar
  });

  const clientesQuery = useQuery({
    queryKey: clientesQueryKey,
    queryFn: clienteService.listar
  });

  const projetosQuery = useQuery({
    queryKey: projetosQueryKey,
    queryFn: projetoService.listar
  });

  const usuariosQuery = useQuery({
    queryKey: usuariosQueryKey,
    queryFn: usuarioService.listar
  });

  const clientes = useMemo(() => (clientesQuery.data ?? []).filter((cliente) => cliente.ativo), [clientesQuery.data]);
  const projetos = useMemo(() => (projetosQuery.data ?? []).filter((projeto) => projeto.ativo), [projetosQuery.data]);
  const responsaveis = useMemo(
    () => (usuariosQuery.data ?? []).filter((usuario) => usuario.ativo && usuario.perfil !== "CLIENTE"),
    [usuariosQuery.data]
  );

  const ordensFiltradas = useMemo(() => {
    return (ordensQuery.data ?? []).filter((ordem) => {
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

      return matchCliente && matchProjeto && matchStatus && matchInicio && matchFim;
    });
  }, [clienteFiltro, dataFim, dataInicio, ordensQuery.data, projetoFiltro, statusFiltro]);

  const valorHoraAnalise = useMemo(() => {
    if (!ordemAnalise) {
      return 0;
    }

    return clientes.find((cliente) => cliente.id === ordemAnalise.clienteId)?.valorHora ?? 0;
  }, [clientes, ordemAnalise]);

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

  const excluirMutation = useMutation({
    mutationFn: ordemServicoService.excluir,
    onMutate: (id) => setOsEmAcaoId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("OS excluida com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel excluir a OS.");
    },
    onSettled: () => setOsEmAcaoId(null)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, descricao }: { id: string; status: StatusOS; descricao?: string }) =>
      ordemServicoService.atualizarStatus(id, status, descricao),
    onMutate: ({ id }) => setOsEmAcaoId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("Status da OS atualizado.");
    },
    onError: () => {
      toast.error("Transicao de status invalida ou nao permitida.");
    },
    onSettled: () => setOsEmAcaoId(null)
  });

  const analiseMutation = useMutation({
    mutationFn: (data: OrdemServicoAnaliseFormData) => {
      if (!ordemAnalise) {
        throw new Error("Selecione uma OS para analisar.");
      }

      return ordemServicoService.atualizarAnalise(ordemAnalise.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      setAnaliseDialogOpen(false);
      setOrdemAnalise(null);
      toast.success("Analise da OS salva com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel salvar a analise da OS.");
    }
  });

  const isLoading = ordensQuery.isLoading || clientesQuery.isLoading || projetosQuery.isLoading || usuariosQuery.isLoading;
  const isError = ordensQuery.isError || clientesQuery.isError || projetosQuery.isError || usuariosQuery.isError;

  function abrirCadastro() {
    setOrdemSelecionada(null);
    setDialogOpen(true);
  }

  function abrirEdicao(ordem: OrdemServico) {
    setOrdemSelecionada(ordem);
    setDialogOpen(true);
  }

  function abrirAnalise(ordem: OrdemServico) {
    setOrdemAnalise(ordem);
    setAnaliseDialogOpen(true);
  }

  function excluirOrdem(ordem: OrdemServico) {
    if (!window.confirm(`Excluir a OS ${ordem.titulo}?`)) {
      return;
    }

    excluirMutation.mutate(ordem.id);
  }

  function atualizarStatus(ordem: OrdemServico, status: StatusOS) {
    if (status === ordem.status) {
      return;
    }

    if (status === "FINALIZADA") {
      const descricao = window.prompt("Informe o que foi feito para finalizar a OS:");

      if (!descricao?.trim()) {
        toast.error("Informe o que foi feito antes de finalizar a OS.");
        return;
      }

      statusMutation.mutate({ id: ordem.id, status, descricao: descricao.trim() });
      return;
    }

    statusMutation.mutate({ id: ordem.id, status });
  }

  function recarregar() {
    ordensQuery.refetch();
    clientesQuery.refetch();
    projetosQuery.refetch();
    usuariosQuery.refetch();
  }

  function limparFiltros() {
    setClienteFiltro("");
    setProjetoFiltro("");
    setStatusFiltro("");
    setDataInicio("");
    setDataFim("");
  }

  return (
    <AppShell>
      <PageHeader
        title="Ordens de Servico"
        description="Acompanhe demandas tecnicas por status, prioridade e responsavel."
        actions={
          <Button onClick={abrirCadastro} disabled={clientes.length === 0 || isLoading}>
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(160px,1fr)_150px_150px_auto]">
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
            <Button variant="outline" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
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
              <Button variant="outline" size="sm" onClick={abrirCadastro} disabled={clientes.length === 0}>
                <Plus className="h-4 w-4" />
                Cadastrar OS
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[280px]">OS</TableHead>
                  <TableHead className="min-w-[220px]">Cliente / Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="min-w-[170px]">Responsavel</TableHead>
                  <TableHead className="min-w-[150px]">Prazo</TableHead>
                  <TableHead className="min-w-[150px] text-right">Valor</TableHead>
                  <TableHead className="w-[190px] text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensFiltradas.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell>
                      <div className="max-w-[360px]">
                        <div className="truncate font-medium" title={ordem.titulo}>
                          {ordem.titulo}
                        </div>
                        <div className="truncate text-xs text-muted-foreground" title={ordem.descricao}>
                          {ordem.descricao}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[280px]">
                        <div className="truncate text-sm" title={ordem.clienteNome}>
                          {ordem.clienteNome}
                        </div>
                        <div className="truncate text-xs text-muted-foreground" title={ordem.projetoNome || "Sem projeto"}>
                          {ordem.projetoNome || "Sem projeto"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ordem.status}
                        disabled={osEmAcaoId === ordem.id}
                        onValueChange={(status) => atualizarStatus(ordem, status as StatusOS)}
                      >
                        <SelectTrigger className="h-8 w-[210px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[190px] truncate" title={ordem.responsavelNome || "A definir"}>
                        {ordem.responsavelNome || "A definir"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{formatarData(ordem.prazo)}</div>
                      <div className="text-xs text-muted-foreground">
                        {ordem.estimativaHoras != null ? `${ordem.estimativaHoras}h previstas` : "Sem estimativa"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatarValor(ordem.valorTotalEstimado)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => abrirAnalise(ordem)} aria-label="Analisar OS">
                          <ClipboardCheck className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => abrirEdicao(ordem)} aria-label="Editar OS">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={osEmAcaoId === ordem.id}
                          onClick={() => excluirOrdem(ordem)}
                          aria-label="Excluir OS"
                        >
                          {osEmAcaoId === ordem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              {ordemSelecionada ? "Atualize os dados principais da ordem de servico." : "Registre a demanda inicial para analise tecnica."}
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

      <Dialog
        open={analiseDialogOpen}
        onOpenChange={(open) => {
          setAnaliseDialogOpen(open);
          if (!open) {
            setOrdemAnalise(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{ordemAnalise?.status === "EM_ANALISE" ? "Analisar OS" : "Visualizar analise"}</DialogTitle>
            <DialogDescription>
              {ordemAnalise?.status === "EM_ANALISE"
                ? "Informe a estimativa de horas para calcular o valor previsto da ordem de servico."
                : "Consulte os dados de analise registrados para esta ordem de servico."}
            </DialogDescription>
          </DialogHeader>
          {ordemAnalise ? (
            <OrdemServicoAnaliseForm
              ordem={ordemAnalise}
              valorHora={valorHoraAnalise}
              isSubmitting={analiseMutation.isPending}
              readOnly={ordemAnalise.status !== "EM_ANALISE"}
              onSubmit={(data) => analiseMutation.mutate(data)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
