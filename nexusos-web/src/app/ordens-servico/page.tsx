"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoForm } from "@/components/shared/ordem-servico-form";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
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

export default function OrdensServicoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

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

  const isLoading = ordensQuery.isLoading || clientesQuery.isLoading || projetosQuery.isLoading || usuariosQuery.isLoading;
  const isError = ordensQuery.isError || clientesQuery.isError || projetosQuery.isError || usuariosQuery.isError;

  function abrirCadastro() {
    setOrdemSelecionada(null);
    setDialogOpen(true);
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
                  <TableHead className="min-w-0">OS</TableHead>
                  <TableHead>Cliente / Projeto</TableHead>
                  <TableHead className="w-[190px]">Status</TableHead>
                  <TableHead className="w-[160px]">Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensFiltradas.map((ordem) => (
                  <TableRow
                    key={ordem.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/ordens-servico/${ordem.id}`)}
                  >
                    <TableCell>
                      <div className="max-w-[420px] min-w-0">
                        <div className="truncate font-medium" title={ordem.titulo}>
                          n° {ordem.codigo} - {ordem.titulo}
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
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${prazoClasses(ordem.prazo)}`}>
                        {formatarDataPrazo(ordem.prazo)}
                      </span>
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

    </AppShell>
  );
}
