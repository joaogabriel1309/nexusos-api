"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
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

const perfilLabels: Record<PerfilUsuario, string> = {
  ADMIN: "Administrador",
  DESENVOLVEDOR: "Desenvolvedor",
  ANALISTA: "Analista",
  CLIENTE: "Cliente"
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [usuarioInativandoId, setUsuarioInativandoId] = useState<string | null>(null);

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
      toast.success(usuarioSelecionado ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o usuario.");
    }
  });

  const inativarUsuarioMutation = useMutation({
    mutationFn: usuarioService.inativar,
    onMutate: (id) => {
      setUsuarioInativandoId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosQueryKey });
      toast.success("Usuario inativado com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel inativar o usuario.");
    },
    onSettled: () => {
      setUsuarioInativandoId(null);
    }
  });

  const usuarios = usuariosQuery.data ?? [];

  function abrirCadastro() {
    setUsuarioSelecionado(null);
    setDialogOpen(true);
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioSelecionado(usuario);
    setDialogOpen(true);
  }

  function inativarUsuario(usuario: Usuario) {
    if (!window.confirm(`Inativar o usuario ${usuario.nome}?`)) {
      return;
    }

    inativarUsuarioMutation.mutate(usuario.id);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Usuarios"
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
              <div className="space-y-3 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : usuariosQuery.isError ? (
              <div className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Nao foi possivel carregar os usuarios.</span>
                <Button variant="outline" size="sm" onClick={() => usuariosQuery.refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Nenhum usuario cadastrado.</span>
                <Button variant="outline" size="sm" onClick={abrirCadastro}>
                  <Plus className="h-4 w-4" />
                  Cadastrar usuario
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px] text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
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
                          <Button variant="outline" size="icon" onClick={() => abrirEdicao(usuario)} aria-label="Editar usuario">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={!usuario.ativo || usuarioInativandoId === usuario.id}
                            onClick={() => inativarUsuario(usuario)}
                            aria-label="Inativar usuario"
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
            )}
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
            <DialogTitle>{usuarioSelecionado ? "Editar usuario" : "Novo usuario"}</DialogTitle>
            <DialogDescription>
              {usuarioSelecionado ? "Atualize os dados de acesso do usuario." : "Informe os dados do novo usuario."}
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
