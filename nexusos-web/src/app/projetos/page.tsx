"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CriticalActionDialog } from "@/components/shared/critical-action-dialog";
import { ProjetoForm } from "@/components/shared/projeto-form";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjetoFormData } from "@/schemas/projeto-schema";
import { clienteService } from "@/services/cliente-service";
import { projetoService } from "@/services/projeto-service";
import type { Projeto } from "@/types";

const projetosQueryKey = ["projetos"];
const clientesQueryKey = ["clientes"];
const itensPorPagina = 20;

export default function ProjetosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null);
  const [projetoParaInativar, setProjetoParaInativar] = useState<Projeto | null>(null);
  const [projetoInativandoId, setProjetoInativandoId] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [buscaInicial, setBuscaInicial] = useState("");

  useEffect(() => {
    setBuscaInicial(new URLSearchParams(window.location.search).get("busca")?.toLocaleLowerCase("pt-BR") ?? "");
  }, []);

  const projetosQuery = useQuery({
    queryKey: projetosQueryKey,
    queryFn: projetoService.listar
  });

  const clientesQuery = useQuery({
    queryKey: clientesQueryKey,
    queryFn: clienteService.listar
  });

  const salvarProjetoMutation = useMutation({
    mutationFn: (data: ProjetoFormData) => {
      if (projetoSelecionado) {
        return projetoService.atualizar(projetoSelecionado.id, {
          ...data,
          ativo: projetoSelecionado.ativo
        });
      }

      return projetoService.criar(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projetosQueryKey });
      setDialogOpen(false);
      setProjetoSelecionado(null);
      toast.success(projetoSelecionado ? "Projeto atualizado com sucesso." : "Projeto cadastrado com sucesso.");
    },
    onError: () => {
      toast.error("Não foi possível salvar o projeto.");
    }
  });

  const inativarProjetoMutation = useMutation({
    mutationFn: projetoService.inativar,
    onMutate: (id) => setProjetoInativandoId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projetosQueryKey });
      setProjetoParaInativar(null);
      toast.success("Projeto inativado com sucesso.");
    },
    onError: () => {
      toast.error("Não foi possível inativar o projeto.");
    },
    onSettled: () => setProjetoInativandoId(null)
  });

  const projetos = useMemo(() => (projetosQuery.data ?? []).filter((projeto) =>
    !buscaInicial || projeto.nome.toLocaleLowerCase("pt-BR").includes(buscaInicial)
  ), [buscaInicial, projetosQuery.data]);
  const clientes = (clientesQuery.data ?? []).filter((cliente) => cliente.ativo);
  const totalPaginas = Math.max(1, Math.ceil(projetos.length / itensPorPagina));
  const projetosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return projetos.slice(inicio, inicio + itensPorPagina);
  }, [paginaAtual, projetos]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  function abrirCadastro() {
    setProjetoSelecionado(null);
    setDialogOpen(true);
  }

  function abrirEdicao(projeto: Projeto) {
    setProjetoSelecionado(projeto);
    setDialogOpen(true);
  }

  function inativarProjeto(projeto: Projeto) {
    setProjetoParaInativar(projeto);
  }

  return (
    <AppShell>
      <PageHeader
        title="Projetos"
        description="Cadastre projetos e vincule-os opcionalmente às tickets."
        actions={
          <Button onClick={abrirCadastro} disabled={clientes.length === 0 || clientesQuery.isLoading}>
            <Plus className="h-4 w-4" />
            Novo projeto
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {projetosQuery.isLoading || clientesQuery.isLoading ? (
            <div className="space-y-3 p-4 sm:p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : projetosQuery.isError || clientesQuery.isError ? (
            <div className="flex flex-col gap-3 p-4 sm:p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Não foi possível carregar os projetos.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    projetosQuery.refetch();
                    clientesQuery.refetch();
                  }}
                >
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : projetos.length === 0 ? (
            <div className="flex flex-col gap-3 p-4 sm:p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nenhum projeto cadastrado.</span>
                <Button variant="outline" size="sm" onClick={abrirCadastro} disabled={clientes.length === 0}>
                <Plus className="h-4 w-4" />
                Cadastrar projeto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetosPaginados.map((projeto) => (
                    <TableRow key={projeto.id}>
                      <TableCell className="font-medium">{projeto.nome}</TableCell>
                      <TableCell>{projeto.clienteNome || "-"}</TableCell>
                      <TableCell className="max-w-[520px] whitespace-normal text-muted-foreground">
                        {projeto.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={projeto.ativo ? "default" : "secondary"}>
                          {projeto.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => abrirEdicao(projeto)} aria-label="Editar projeto">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={!projeto.ativo || projetoInativandoId === projeto.id}
                            onClick={() => inativarProjeto(projeto)}
                            aria-label="Inativar projeto"
                          >
                            {projetoInativandoId === projeto.id ? (
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
            </div>
          )}

          {!projetosQuery.isLoading && !projetosQuery.isError && projetos.length > 0 ? (
            <TablePagination
              page={paginaAtual}
              totalItems={projetos.length}
              pageSize={itensPorPagina}
              onPageChange={setPaginaAtual}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setProjetoSelecionado(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{projetoSelecionado ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>
              {projetoSelecionado ? "Atualize os dados do projeto." : "Informe os dados do novo projeto."}
            </DialogDescription>
          </DialogHeader>
          <ProjetoForm
            projeto={projetoSelecionado}
            clientes={clientes}
            isSubmitting={salvarProjetoMutation.isPending}
            onSubmit={(data) => salvarProjetoMutation.mutate(data)}
          />
        </DialogContent>
      </Dialog>
      <CriticalActionDialog
        open={Boolean(projetoParaInativar)}
        title="Inativar projeto?"
        description="Confirme a inativacao deste projeto antes de continuar."
        itemName={projetoParaInativar?.nome ?? ""}
        impacts={["O projeto deixara de estar disponivel para novos tickets.", "As ordens e o historico ja registrados serao preservados."]}
        confirmLabel="Inativar projeto"
        isPending={inativarProjetoMutation.isPending}
        onConfirm={() => projetoParaInativar && inativarProjetoMutation.mutate(projetoParaInativar.id)}
        onOpenChange={(open) => !open && setProjetoParaInativar(null)}
      />
    </AppShell>
  );
}
