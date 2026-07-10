"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getNotificacaoTipoLabel, getNotificacaoTipoVariant, getResumoNotificacao } from "@/lib/notificacao-labels";
import { notificacaoService } from "@/services/notificacao-service";

const itensPorPagina = 20;
const todosTiposOption = "__todos_tipos__";
const todasSituacoesOption = "__todas_situacoes__";
const lidasOption = "__lidas__";
const naoLidasOption = "__nao_lidas__";

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(data));
}

export default function NotificacoesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState(todasSituacoesOption);

  const lidaFiltro = useMemo(() => {
    if (situacaoFiltro === lidasOption) {
      return true;
    }

    if (situacaoFiltro === naoLidasOption) {
      return false;
    }

    return undefined;
  }, [situacaoFiltro]);

  const notificacoesQuery = useQuery({
    queryKey: ["notificacoes", "historico", paginaAtual, tipoFiltro, lidaFiltro],
    queryFn: () =>
      notificacaoService.listarHistorico({
        pagina: paginaAtual,
        tamanho: itensPorPagina,
        tipo: tipoFiltro || undefined,
        lida: lidaFiltro
      })
  });

  const marcarComoLidaMutation = useMutation({
    mutationFn: notificacaoService.marcarComoLida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
    onError: () => {
      toast.error("Não foi possível atualizar a notificação.");
    }
  });

  const marcarTodasComoLidasMutation = useMutation({
    mutationFn: notificacaoService.marcarTodasComoLidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas as notificações foram marcadas como lidas.");
    },
    onError: () => {
      toast.error("Não foi possível marcar todas como lidas.");
    }
  });

  useEffect(() => {
    setPaginaAtual(1);
  }, [tipoFiltro, situacaoFiltro]);

  const resposta = notificacoesQuery.data;
  const notificacoes = resposta?.itens ?? [];
  const tiposDisponiveis = resposta?.tiposDisponiveis ?? [];
  const naoLidas = resposta?.naoLidas ?? 0;

  function abrirNotificacao(id: string, ordemServicoId?: string) {
    if (!marcarComoLidaMutation.isPending) {
      marcarComoLidaMutation.mutate(id);
    }

    if (ordemServicoId) {
      router.push(`/ordens-servico/${ordemServicoId}`);
    }
  }

  function limparFiltros() {
    setTipoFiltro("");
    setSituacaoFiltro(todasSituacoesOption);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Notificações"
          description="Acompanhe atribuições, mudanças de status, prazos e eventos importantes das OS."
          actions={
            <Button
              variant="outline"
              disabled={naoLidas === 0 || marcarTodasComoLidasMutation.isPending}
              onClick={() => marcarTodasComoLidasMutation.mutate()}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          }
        />

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]">
              <Select
                value={tipoFiltro || todosTiposOption}
                onValueChange={(value) => setTipoFiltro(value === todosTiposOption ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo da notificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={todosTiposOption}>Todos os tipos</SelectItem>
                  {tiposDisponiveis.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {getNotificacaoTipoLabel(tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={situacaoFiltro} onValueChange={setSituacaoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={todasSituacoesOption}>Todas</SelectItem>
                  <SelectItem value={naoLidasOption}>Não lidas</SelectItem>
                  <SelectItem value={lidasOption}>Lidas</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={limparFiltros} className="w-full sm:w-auto">
                Limpar
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={naoLidas > 0 ? "warning" : "secondary"}>{naoLidas} não lidas</Badge>
              <span>Total no histórico: {resposta?.totalItens ?? 0}</span>
            </div>

            {notificacoesQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-lg border p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : notificacoesQuery.isError ? (
              <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Não foi possível carregar o histórico de notificações.</span>
                <Button variant="outline" size="sm" onClick={() => notificacoesQuery.refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Nenhuma notificação encontrada</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajuste os filtros ou aguarde novos eventos do sistema.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {notificacoes.map((notificacao) => (
                  <div
                    key={notificacao.id}
                    className={`rounded-lg border p-4 transition-colors ${notificacao.lida ? "bg-background" : "bg-primary/5"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{notificacao.titulo}</span>
                          <Badge variant={getNotificacaoTipoVariant(notificacao.tipo)}>
                            {getNotificacaoTipoLabel(notificacao.tipo)}
                          </Badge>
                          <Badge variant={notificacao.lida ? "secondary" : "default"}>
                            {notificacao.lida ? "Lida" : "Não lida"}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">{notificacao.mensagem}</p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{getResumoNotificacao(notificacao)}</span>
                          <span>•</span>
                          <span>{formatarDataHora(notificacao.criadoEm)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {!notificacao.lida ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={marcarComoLidaMutation.isPending}
                            onClick={() => marcarComoLidaMutation.mutate(notificacao.id)}
                          >
                            Marcar como lida
                          </Button>
                        ) : null}

                        {notificacao.ordemServicoId ? (
                          <Button size="sm" onClick={() => abrirNotificacao(notificacao.id, notificacao.ordemServicoId)}>
                            <ExternalLink className="h-4 w-4" />
                            Abrir OS
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {!notificacoesQuery.isLoading && !notificacoesQuery.isError && (resposta?.totalItens ?? 0) > 0 ? (
            <TablePagination
              page={paginaAtual}
              totalItems={resposta?.totalItens ?? 0}
              pageSize={resposta?.tamanho ?? itensPorPagina}
              onPageChange={setPaginaAtual}
            />
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
