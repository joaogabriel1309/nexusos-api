"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { UsuarioForm } from "@/components/shared/usuario-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type UsuarioFormData, validarUsuarioForm } from "@/schemas/usuario-schema";
import { usuarioService } from "@/services/usuario-service";
import type { PerfilUsuario, Usuario } from "@/types";

const usuariosQueryKey = ["usuarios"];
const itensPorPagina = 20;

const perfilLabels: Record<PerfilUsuario, string> = {
  ADMIN: "Administrador",
  DESENVOLVEDOR: "Desenvolvedor"
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [usuarioInativandoId, setUsuarioInativandoId] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const usuariosQuery = useQuery({
    queryKey: usuariosQueryKey,
    queryFn: usuarioService.listar
  });

  const salvarUsuarioMutation = useMutation({
    mutationFn: (data: UsuarioFormData) => {
      const payload = validarUsuarioForm(data, Boolean(usuarioSelecionado));

      if (usuarioSelecionado) {
        return usuarioService.atualizar(usuarioSelecionado.id, {
          nome: payload.nome,
          email: payload.email,
          senha: payload.senha || undefined,
          perfil: payload.perfil,
          ativo: usuarioSelecionado.ativo
        });
      }

      return usuarioService.criar({
        nome: payload.nome,
        email: payload.email,
        senha: payload.senha as string,
        perfil: payload.perfil
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosQueryKey });
      setDialogOpen(false);
      setUsuarioSelecionado(null);
      toast.success(usuarioSelecionado ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário.");
    }
  });

  const inativarUsuarioMutation = useMutation({
    mutationFn: usuarioService.inativar,
    onMutate: (id) => {
      setUsuarioInativandoId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosQueryKey });
      toast.success("Usuário inativado com sucesso.");
    },
    onError: () => {
      toast.error("Não foi possível inativar o usuário.");
    },
    onSettled: () => {
      setUsuarioInativandoId(null);
    }
  });

  const usuarios = useMemo(() => usuariosQuery.data ?? [], [usuariosQuery.data]);
  const totalPaginas = Math.max(1, Math.ceil(usuarios.length / itensPorPagina));
  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return usuarios.slice(inicio, inicio + itensPorPagina);
  }, [paginaAtual, usuarios]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  function abrirCadastro() {
    setUsuarioSelecionado(null);
    setDialogOpen(true);
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioSelecionado(usuario);
    setDialogOpen(true);
  }

  function inativarUsuario(usuario: Usuario) {
    if (!window.confirm(`Inativar o usuário ${usuario.nome}?`)) {
      return;
    }

    inativarUsuarioMutation.mutate(usuario.id);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Usuários"
          description="Gerencie acessos, perfis e status dos usuarios do NexusOS."
          actions={
            <Button onClick={abrirCadastro}>
              <Plus className="h-4 w-4" />
              Novo usuario
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {usuariosQuery.isLoading ? (
              <div className="space-y-3 p-4 sm:p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : usuariosQuery.isError ? (
              <div className="flex flex-col gap-3 p-4 sm:p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Não foi possível carregar os usuários.</span>
                <Button variant="outline" size="sm" onClick={() => usuariosQuery.refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="flex flex-col gap-3 p-4 sm:p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Nenhum usuario cadastrado.</span>
                <Button variant="outline" size="sm" onClick={abrirCadastro}>
                  <Plus className="h-4 w-4" />
                  Cadastrar usuario
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosPaginados.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nome}</TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{perfilLabels[usuario.perfil]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.ativo ? "default" : "secondary"}>
                            {usuario.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => abrirEdicao(usuario)} aria-label="Editar usuário">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              disabled={!usuario.ativo || usuarioInativandoId === usuario.id}
                              onClick={() => inativarUsuario(usuario)}
                              aria-label="Inativar usuário"
                            >
                              {usuarioInativandoId === usuario.id ? (
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

            {!usuariosQuery.isLoading && !usuariosQuery.isError && usuarios.length > 0 ? (
              <TablePagination
                page={paginaAtual}
                totalItems={usuarios.length}
                pageSize={itensPorPagina}
                onPageChange={setPaginaAtual}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setUsuarioSelecionado(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{usuarioSelecionado ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {usuarioSelecionado ? "Atualize os dados de acesso do usuário." : "Informe os dados do novo usuário."}
            </DialogDescription>
          </DialogHeader>
          <UsuarioForm
            usuario={usuarioSelecionado}
            isSubmitting={salvarUsuarioMutation.isPending}
            onSubmit={(data) => salvarUsuarioMutation.mutate(data)}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
