"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Edit, Link2, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ClienteForm } from "@/components/shared/cliente-form";
import { CriticalActionDialog } from "@/components/shared/critical-action-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clienteSchema, type ClienteFormData } from "@/schemas/cliente-schema";
import { clienteService } from "@/services/cliente-service";
import type { Cliente } from "@/types";

const clientesQueryKey = ["clientes"];
const itensPorPagina = 20;

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clienteParaInativar, setClienteParaInativar] = useState<Cliente | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [buscaInicial, setBuscaInicial] = useState("");

  useEffect(() => {
    setBuscaInicial(new URLSearchParams(window.location.search).get("busca")?.toLocaleLowerCase("pt-BR") ?? "");
  }, []);

  const clientesQuery = useQuery({
    queryKey: clientesQueryKey,
    queryFn: clienteService.listar
  });

  const salvarClienteMutation = useMutation({
    mutationFn: (data: ClienteFormData) => {
      const payload = clienteSchema.parse(data);

      if (clienteSelecionado) {
        return clienteService.atualizar(clienteSelecionado.id, {
          ...payload,
          ativo: clienteSelecionado.ativo
        });
      }

      return clienteService.criar(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      setDialogOpen(false);
      setClienteSelecionado(null);
      toast.success(clienteSelecionado ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
    },
    onError: () => {
      toast.error("Não foi possível salvar o cliente. Verifique os dados e tente novamente.");
    }
  });

  const inativarClienteMutation = useMutation({
    mutationFn: clienteService.inativar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      setClienteParaInativar(null);
      toast.success("Cliente inativado com sucesso.");
    },
    onError: () => {
      toast.error("Não foi possível inativar o cliente.");
    }
  });

  const gerarTokenMutation = useMutation({
    mutationFn: clienteService.gerarTokenAcesso,
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: clientesQueryKey });
      copiarLinkCliente(cliente);
      toast.success("Link de acesso do cliente gerado.");
    },
    onError: () => {
      toast.error("Não foi possível gerar o link do cliente.");
    }
  });

  const clientes = useMemo(() => (clientesQuery.data ?? []).filter((cliente) =>
    !buscaInicial || cliente.nome.toLocaleLowerCase("pt-BR").includes(buscaInicial)
  ), [buscaInicial, clientesQuery.data]);
  const totalPaginas = Math.max(1, Math.ceil(clientes.length / itensPorPagina));
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return clientes.slice(inicio, inicio + itensPorPagina);
  }, [clientes, paginaAtual]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  function abrirCadastro() {
    setClienteSelecionado(null);
    setDialogOpen(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setDialogOpen(true);
  }

  function inativarCliente(cliente: Cliente) {
    setClienteParaInativar(cliente);
  }

  function montarLinkCliente(cliente: Cliente) {
    if (!cliente.tokenAcesso) {
      return "";
    }

    return `${window.location.origin}/portal/cliente/${cliente.tokenAcesso}`;
  }

  async function copiarLinkCliente(cliente: Cliente) {
    if (!cliente.tokenAcesso) {
      gerarTokenMutation.mutate(cliente.id);
      return;
    }

    await navigator.clipboard.writeText(montarLinkCliente(cliente));
    toast.success("Link do cliente copiado.");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Clientes"
          description="Cadastre, consulte e mantenha a base de clientes atendidos pelo NexusOS."
          actions={
            <Button onClick={abrirCadastro}>
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {clientesQuery.isLoading ? (
              <div className="space-y-3 p-4 sm:p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : clientesQuery.isError ? (
              <div className="flex flex-col gap-3 p-4 sm:p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Não foi possível carregar os clientes.</span>
                <Button variant="outline" size="sm" onClick={() => clientesQuery.refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col gap-3 p-4 sm:p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Nenhum cliente cadastrado.</span>
                <Button variant="outline" size="sm" onClick={abrirCadastro}>
                  <Plus className="h-4 w-4" />
                  Cadastrar cliente
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Valor/hora</TableHead>
                      <TableHead>E-mail OS</TableHead>
                      <TableHead>WhatsApp OS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[190px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesPaginados.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>{cliente.documento}</TableCell>
                        <TableCell>{cliente.email}</TableCell>
                        <TableCell>{cliente.telefone || "-"}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cliente.valorHora)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cliente.enviarEmail ? "default" : "secondary"}>
                            {cliente.enviarEmail ? "Ativo" : "Desativado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cliente.enviarWhatsapp ? "default" : "secondary"}>
                            {cliente.enviarWhatsapp ? "Ativo" : "Desativado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cliente.ativo ? "default" : "secondary"}>
                            {cliente.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => abrirEdicao(cliente)} aria-label="Editar cliente">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={gerarTokenMutation.isPending}
                              onClick={() => copiarLinkCliente(cliente)}
                              aria-label={cliente.tokenAcesso ? "Copiar link do cliente" : "Gerar link do cliente"}
                              title={cliente.tokenAcesso ? "Copiar link do cliente" : "Gerar link do cliente"}
                            >
                              {cliente.tokenAcesso ? <Copy className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              disabled={!cliente.ativo || inativarClienteMutation.isPending}
                              onClick={() => inativarCliente(cliente)}
                              aria-label="Inativar cliente"
                            >
                              {inativarClienteMutation.isPending ? (
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

            {!clientesQuery.isLoading && !clientesQuery.isError && clientes.length > 0 ? (
              <TablePagination
                page={paginaAtual}
                totalItems={clientes.length}
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
            setClienteSelecionado(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{clienteSelecionado ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              {clienteSelecionado ? "Atualize os dados cadastrais do cliente." : "Informe os dados do novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <ClienteForm
            cliente={clienteSelecionado}
            isSubmitting={salvarClienteMutation.isPending}
            onSubmit={(data) => salvarClienteMutation.mutate(data)}
          />
        </DialogContent>
      </Dialog>
      <CriticalActionDialog
        open={Boolean(clienteParaInativar)}
        title="Inativar cliente?"
        description="Confirme a inativacao deste cliente antes de continuar."
        itemName={clienteParaInativar?.nome ?? ""}
        impacts={["O cliente deixara de estar disponivel para novos vinculos e operacoes.", "Os dados e o historico existente serao preservados."]}
        confirmLabel="Inativar cliente"
        isPending={inativarClienteMutation.isPending}
        onConfirm={() => clienteParaInativar && inativarClienteMutation.mutate(clienteParaInativar.id)}
        onOpenChange={(open) => !open && setClienteParaInativar(null)}
      />
    </AppShell>
  );
}
