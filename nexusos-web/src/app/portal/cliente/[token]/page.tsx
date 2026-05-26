"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prioridadeLabels, statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
import { portalClienteService } from "@/services/portal-cliente-service";
import type { PortalOrdemServico, StatusOS } from "@/types";

const todosStatusOption = "__todos__";

function formatarDataHora(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(data));
}

function descricaoCurta(ordem: PortalOrdemServico) {
  return `n° ${ordem.codigo} - ${ordem.titulo || ordem.descricao}`;
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarData(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(data));
}

function formatarValor(valor?: number) {
  return valor != null ? moeda.format(valor) : "-";
}

function CampoDetalhe({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border bg-secondary/30 p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm font-medium">{value ?? "-"}</div>
    </div>
  );
}

export default function PortalClientePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const queryClient = useQueryClient();
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [ordemSelecionada, setOrdemSelecionada] = useState<PortalOrdemServico | null>(null);

  const queryKey = ["portal-cliente", token];
  const portalQuery = useQuery({
    queryKey,
    queryFn: () => portalClienteService.listarOrdens(token),
    enabled: Boolean(token)
  });

  const decisaoMutation = useMutation({
    mutationFn: ({ ordemId, aprovado }: { ordemId: string; aprovado: boolean }) => {
      return aprovado ? portalClienteService.aprovar(token, ordemId) : portalClienteService.reprovar(token, ordemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Decisao registrada com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel registrar sua decisao.");
    }
  });

  const ordensFiltradas = useMemo(() => {
    const ordens = portalQuery.data?.ordens ?? [];
    return ordens.filter((ordem) => (statusFiltro ? ordem.status === statusFiltro : true));
  }, [portalQuery.data?.ordens, statusFiltro]);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <div className="text-sm font-semibold text-primary">NexusOS</div>
          <h1 className="text-2xl font-semibold tracking-normal">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Consulte o andamento das suas ordens de servico de forma online e segura.
          </p>
        </header>

        <Card>
          <CardContent className="p-5">
            {portalQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : portalQuery.isError ? (
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Link invalido ou indisponivel.</span>
                <Button variant="outline" size="sm" onClick={() => portalQuery.refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Cliente</div>
                    <div className="text-lg font-semibold">{portalQuery.data?.clienteNome}</div>
                  </div>
                  <Select
                    value={statusFiltro || todosStatusOption}
                    onValueChange={(value) => setStatusFiltro(value === todosStatusOption ? "" : (value as StatusOS))}
                  >
                    <SelectTrigger className="sm:w-[240px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={todosStatusOption}>Todos os status</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {ordensFiltradas.length === 0 ? (
                  <div className="rounded-md border bg-secondary/30 p-5 text-sm text-muted-foreground">
                    Nenhuma OS encontrada para os filtros selecionados.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead>Atualizada em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordensFiltradas.map((ordem) => (
                        <TableRow
                          key={ordem.id}
                          className="cursor-pointer"
                          onClick={() => setOrdemSelecionada(ordem)}
                        >
                          <TableCell>
                            <div className="max-w-[360px]">
                              <div className="truncate font-medium" title={`n° ${ordem.codigo}`}>
                                {descricaoCurta(ordem)}
                              </div>
                              <div className="truncate text-xs text-muted-foreground" title={ordem.descricao}>
                                {ordem.descricao}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
                              {statusLabels[ordem.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatarDataHora(ordem.criadoEm)}</TableCell>
                          <TableCell>{formatarDataHora(ordem.atualizadoEm)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(ordemSelecionada)} onOpenChange={(open) => !open && setOrdemSelecionada(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {ordemSelecionada ? `n° ${ordemSelecionada.codigo} - ${ordemSelecionada.titulo}` : "Detalhes da OS"}
              </DialogTitle>
              <DialogDescription>Dados completos da ordem de servico compartilhados com o cliente.</DialogDescription>
            </DialogHeader>

            {ordemSelecionada ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={statusBadgeClasses[ordemSelecionada.status]}>
                    {statusLabels[ordemSelecionada.status]}
                  </Badge>
                  <Badge variant="outline">{prioridadeLabels[ordemSelecionada.prioridade]}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CampoDetalhe label="Numero da OS" value={`n° ${ordemSelecionada.codigo}`} />
                  <CampoDetalhe label="Projeto" value={ordemSelecionada.projetoNome || "Sem projeto vinculado"} />
                  <CampoDetalhe label="Prazo" value={formatarData(ordemSelecionada.prazo)} />
                  <CampoDetalhe label="Criada em" value={formatarDataHora(ordemSelecionada.criadoEm)} />
                  <CampoDetalhe label="Ultima atualizacao" value={formatarDataHora(ordemSelecionada.atualizadoEm)} />
                  <CampoDetalhe label="Finalizada em" value={formatarDataHora(ordemSelecionada.finalizadoEm)} />
                  <div className="md:col-span-2">
                    <CampoDetalhe label="Texto de recebimento" value={ordemSelecionada.descricao} />
                  </div>
                  <div className="md:col-span-2">
                    <CampoDetalhe label="Texto da analise" value={ordemSelecionada.textoAnalise} />
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Valores</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <CampoDetalhe
                      label="Horas estimadas"
                      value={ordemSelecionada.estimativaHoras != null ? `${ordemSelecionada.estimativaHoras}h` : "-"}
                    />
                    <CampoDetalhe label="Cobranca" value={ordemSelecionada.cobrar === false ? "Nao cobrar" : "Cobrar"} />
                    <CampoDetalhe label="Valor total" value={formatarValor(ordemSelecionada.valorTotalEstimado)} />
                  </CardContent>
                </Card>

                {ordemSelecionada.descricaoFinalizacao || ordemSelecionada.finalizadoEm ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Finalizacao</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CampoDetalhe label="O que foi feito" value={ordemSelecionada.descricaoFinalizacao} />
                    </CardContent>
                  </Card>
                ) : null}

                {ordemSelecionada.status === "AGUARDANDO_APROVACAO" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      disabled={decisaoMutation.isPending}
                      onClick={() => decisaoMutation.mutate({ ordemId: ordemSelecionada.id, aprovado: true })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar OS
                    </Button>
                    <Button
                      variant="outline"
                      disabled={decisaoMutation.isPending}
                      onClick={() => decisaoMutation.mutate({ ordemId: ordemSelecionada.id, aprovado: false })}
                    >
                      <XCircle className="h-4 w-4" />
                      Reprovar OS
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Seguranca do acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Este link e exclusivo para o seu cadastro. Nao compartilhe com terceiros.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
