"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
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
  return ordem.titulo || ordem.descricao || `OS ${ordem.id}`;
}

export default function PortalClientePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const queryClient = useQueryClient();
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});

  const queryKey = ["portal-cliente", token];
  const portalQuery = useQuery({
    queryKey,
    queryFn: () => portalClienteService.listarOrdens(token),
    enabled: Boolean(token)
  });

  const decisaoMutation = useMutation({
    mutationFn: ({ ordemId, aprovado }: { ordemId: string; aprovado: boolean }) => {
      const observacao = observacoes[ordemId]?.trim();
      return aprovado
        ? portalClienteService.aprovar(token, ordemId, observacao)
        : portalClienteService.reprovar(token, ordemId, observacao);
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

  function atualizarObservacao(ordemId: string, observacao: string) {
    setObservacoes((atuais) => ({ ...atuais, [ordemId]: observacao }));
  }

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
                        <TableHead className="min-w-[280px]">Aprovacao</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordensFiltradas.map((ordem) => (
                        <TableRow key={ordem.id}>
                          <TableCell>
                            <div className="max-w-[360px]">
                              <div className="truncate font-medium" title={ordem.id}>
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
                          <TableCell>
                            {ordem.status === "AGUARDANDO_APROVACAO" ? (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Observacao opcional"
                                  value={observacoes[ordem.id] ?? ""}
                                  onChange={(event) => atualizarObservacao(ordem.id, event.target.value)}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    disabled={decisaoMutation.isPending}
                                    onClick={() => decisaoMutation.mutate({ ordemId: ordem.id, aprovado: true })}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Aprovar OS
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={decisaoMutation.isPending}
                                    onClick={() => decisaoMutation.mutate({ ordemId: ordem.id, aprovado: false })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Reprovar OS
                                  </Button>
                                </div>
                              </div>
                            ) : ordem.aprovadoPeloClienteEm ? (
                              <div className="text-sm text-muted-foreground">
                                {ordem.aprovadaPeloCliente ? "Aprovada" : "Reprovada"} em{" "}
                                {formatarDataHora(ordem.aprovadoPeloClienteEm)}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sem acao pendente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
