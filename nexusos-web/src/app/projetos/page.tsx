"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ProjetoForm } from "@/components/shared/projeto-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjetoFormData } from "@/schemas/projeto-schema";
import { projetoService } from "@/services/projeto-service";
import type { Projeto } from "@/types";

const projetosQueryKey = ["projetos"];

export default function ProjetosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null);
  const [projetoInativandoId, setProjetoInativandoId] = useState<string | null>(null);

  const projetosQuery = useQuery({
    queryKey: projetosQueryKey,
    queryFn: projetoService.listar
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
      toast.error("Nao foi possivel salvar o projeto.");
    }
  });

  const inativarProjetoMutation = useMutation({
    mutationFn: projetoService.inativar,
    onMutate: (id) => setProjetoInativandoId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projetosQueryKey });
      toast.success("Projeto inativado com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel inativar o projeto.");
    },
    onSettled: () => setProjetoInativandoId(null)
  });

  const projetos = projetosQuery.data ?? [];

  function abrirCadastro() {
    setProjetoSelecionado(null);
    setDialogOpen(true);
  }

  function abrirEdicao(projeto: Projeto) {
    setProjetoSelecionado(projeto);
    setDialogOpen(true);
  }

  function inativarProjeto(projeto: Projeto) {
    if (!window.confirm(`Inativar o projeto ${projeto.nome}?`)) {
      return;
    }

    inativarProjetoMutation.mutate(projeto.id);
  }

  return (
    <AppShell>
      <PageHeader
        title="Projetos"
        description="Cadastre projetos e vincule-os opcionalmente as ordens de servico."
        actions={
          <Button onClick={abrirCadastro}>
            <Plus className="h-4 w-4" />
            Novo projeto
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {projetosQuery.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : projetosQuery.isError ? (
            <div className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nao foi possivel carregar os projetos.</span>
              <Button variant="outline" size="sm" onClick={() => projetosQuery.refetch()}>
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : projetos.length === 0 ? (
            <div className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Nenhum projeto cadastrado.</span>
              <Button variant="outline" size="sm" onClick={abrirCadastro}>
                <Plus className="h-4 w-4" />
                Cadastrar projeto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projetos.map((projeto) => (
                  <TableRow key={projeto.id}>
                    <TableCell className="font-medium">{projeto.nome}</TableCell>
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
          )}
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
            isSubmitting={salvarProjetoMutation.isPending}
            onSubmit={(data) => salvarProjetoMutation.mutate(data)}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
