"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, CalendarClock, ClipboardList, Clock, Code2, GripVertical, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { prioridadeLabels, statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
import { useAuth } from "@/providers/auth-provider";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { usuarioService } from "@/services/usuario-service";
import type { OrdemServico, PrioridadeOS, StatusOS } from "@/types";

const ordensQueryKey = ["minhas-os"];
const todosOption = "__todos__";
const prioridades: PrioridadeOS[] = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];
const statusFiltroOptions = statusOptions.filter((status) => status !== "FINALIZADA");
const statusAcao: StatusOS[] = ["RECEBIDA", "EM_ANALISE", "AGUARDANDO_APROVACAO", "APROVADA", "EM_TESTE", "AGUARDANDO_PAGAMENTO"];

type PrazoGrupo = "vencidas" | "hoje" | "proximas" | "sem-prazo" | "futuras";

function inicioDoDia() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

function classificarPrazo(prazo?: string): PrazoGrupo {
  if (!prazo) {
    return "sem-prazo";
  }

  const inicioHoje = inicioDoDia();
  const fimHoje = new Date(inicioHoje);
  fimHoje.setHours(23, 59, 59, 999);
  const limiteProximo = new Date(inicioHoje);
  limiteProximo.setDate(limiteProximo.getDate() + 3);
  const dataPrazo = new Date(`${prazo}T00:00:00`);

  if (dataPrazo < inicioHoje) return "vencidas";
  if (dataPrazo <= fimHoje) return "hoje";
  if (dataPrazo <= limiteProximo) return "proximas";
  return "futuras";
}

function ordenarFila(a: OrdemServico, b: OrdemServico) {
  return (a.sequenciaExecucao ?? Number.MAX_SAFE_INTEGER) - (b.sequenciaExecucao ?? Number.MAX_SAFE_INTEGER)
    || new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
    || b.codigo - a.codigo;
}

function MetricaCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default"
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof ClipboardList;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneClasses = {
    default: "border-slate-200 bg-white",
    danger: "border-red-200 bg-red-50",
    warning: "border-amber-200 bg-amber-50",
    success: "border-emerald-200 bg-emerald-50"
  };

  return (
    <Card className={toneClasses[tone]}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function OrdemCard({ ordem, reordenavel = false, atualizando = false, podeSubir = false, podeDescer = false, onMover, onDrop }: {
  ordem: OrdemServico;
  reordenavel?: boolean;
  atualizando?: boolean;
  podeSubir?: boolean;
  podeDescer?: boolean;
  onMover?: (deslocamento: -1 | 1) => void;
  onDrop?: (ordem: OrdemServico) => void;
}) {
  const router = useRouter();

  // Regra de navegação: o detalhe deve retornar para a listagem que o abriu.
  function abrirOrdem() {
    router.push(`/ordens-servico/${ordem.id}?origem=minhas-os`);
  }

  return (
    <div
      className="w-full rounded-md border bg-background p-4 text-left shadow-sm"
      draggable={reordenavel && !atualizando}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", ordem.id)}
      onDragOver={(event) => { if (reordenavel) event.preventDefault(); }}
      onDrop={(event) => { event.preventDefault(); onDrop?.(ordem); }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        {reordenavel ? <GripVertical className="mt-0.5 h-5 w-5 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" /> : null}
        <button type="button" className="min-w-0 flex-1 text-left hover:text-primary" onClick={abrirOrdem}>
          <div className="truncate font-semibold" title={ordem.titulo}>
            {ordem.codigo} - {ordem.titulo}
          </div>
          <div className="mt-1 truncate text-sm text-muted-foreground" title={ordem.clienteNome}>
            {ordem.clienteNome} {ordem.projetoNome ? `- ${ordem.projetoNome}` : ""}
          </div>
        </button>
        <button type="button" aria-label={`Abrir ticket ${ordem.codigo}`} onClick={abrirOrdem}>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
          {statusLabels[ordem.status]}
        </Badge>
        <Badge variant={ordem.prioridade === "CRITICA" ? "danger" : ordem.prioridade === "ALTA" ? "warning" : "secondary"}>
          {prioridadeLabels[ordem.prioridade]}
        </Badge>
        <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${prazoClasses(ordem.prazo)}`}>
          {formatarDataPrazo(ordem.prazo)}
        </span>
      </div>
      {reordenavel ? (
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!podeSubir || atualizando} onClick={() => onMover?.(-1)} aria-label={`Mover ticket ${ordem.codigo} para cima`}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!podeDescer || atualizando} onClick={() => onMover?.(1)} aria-label={`Mover ticket ${ordem.codigo} para baixo`}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      Nenhum ticket encontrado para os filtros selecionados.
    </div>
  );
}

export default function MinhasOsPage() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = usuario?.perfil === "ADMIN";
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<PrioridadeOS | "">("");
  const [responsavelFiltro, setResponsavelFiltro] = useState("");
  const [ordemArrastadaId, setOrdemArrastadaId] = useState<string | null>(null);

  const ordensQuery = useQuery({
    queryKey: ordensQueryKey,
    queryFn: ordemServicoService.listar
  });

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "minhas-os"],
    queryFn: usuarioService.listar,
    enabled: isAdmin
  });

  const responsaveis = useMemo(() => (usuariosQuery.data ?? []).filter((item) => item.ativo), [usuariosQuery.data]);
  const responsavelSelecionadoId = isAdmin ? (responsavelFiltro || responsaveis[0]?.id || "") : usuario?.id;
  const responsavelSelecionado = responsaveis.find((item) => item.id === responsavelSelecionadoId);

  const sequenciaMutation = useMutation({
    mutationFn: ({ id, posicao }: { id: string; posicao: number }) => ordemServicoService.atualizarSequencia(id, posicao),
    onSuccess: (fila) => {
      queryClient.setQueryData<OrdemServico[]>(ordensQueryKey, (atuais = []) => {
        const atualizadas = new Map(fila.map((ordem) => [ordem.id, ordem]));
        return atuais.map((ordem) => atualizadas.get(ordem.id) ?? ordem);
      });
      toast.success("Sequência de execução atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar a sequência.")
  });

  const minhasOrdens = useMemo(() => {
    return (ordensQuery.data ?? [])
      .filter((ordem) => ordem.status !== "FINALIZADA")
      .filter((ordem) => (responsavelSelecionadoId ? ordem.responsavelId === responsavelSelecionadoId : false))
      .filter((ordem) => (statusFiltro ? ordem.status === statusFiltro : true))
      .filter((ordem) => (prioridadeFiltro ? ordem.prioridade === prioridadeFiltro : true))
      .sort(ordenarFila);
  }, [ordensQuery.data, prioridadeFiltro, responsavelSelecionadoId, statusFiltro]);

  const renderOrdem = (ordem: OrdemServico) => <OrdemCard key={ordem.id} ordem={ordem} />;
  const podeReordenar = isAdmin && !statusFiltro && !prioridadeFiltro;

  function moverOrdem(id: string, posicao: number) {
    sequenciaMutation.mutate({ id, posicao });
  }

  const vencidas = minhasOrdens.filter((ordem) => classificarPrazo(ordem.prazo) === "vencidas");
  const hoje = minhasOrdens.filter((ordem) => classificarPrazo(ordem.prazo) === "hoje");
  const aguardandoAcao = minhasOrdens.filter((ordem) => statusAcao.includes(ordem.status));
  const emDesenvolvimento = minhasOrdens.filter((ordem) => ordem.status === "EM_DESENVOLVIMENTO");

  const porPrioridade = prioridades.map((prioridade) => ({
    prioridade,
    ordens: minhasOrdens.filter((ordem) => ordem.prioridade === prioridade)
  }));

  function recarregar() {
    ordensQuery.refetch();
  }

  return (
    <AppShell>
      <PageHeader
        title="Meus tickets"
        description={`Fila técnica de ${isAdmin ? (responsavelSelecionado?.nome ?? "usuário") : (usuario?.nome ?? "desenvolvedor")} na sequência definida para execução.`}
        actions={
          <Button variant="outline" onClick={recarregar} disabled={ordensQuery.isLoading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {ordensQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : ordensQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Não foi possível carregar seus tickets.</span>
            <Button variant="outline" size="sm" onClick={recarregar}>
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricaCard title="Vencidas" value={vencidas.length} description="Precisam de prioridade imediata." icon={AlertTriangle} tone="danger" />
            <MetricaCard title="Para hoje" value={hoje.length} description="Devem ser tratadas neste dia." icon={CalendarClock} tone="warning" />
            <MetricaCard title="Aguardam ação" value={aguardandoAcao.length} description="Dependem de uma próxima etapa." icon={Clock} />
            <MetricaCard title="Em desenvolvimento" value={emDesenvolvimento.length} description="Trabalho técnico em andamento." icon={Code2} tone="success" />
          </section>

          <Card className="mt-5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
              {isAdmin ? (
                <Select value={responsavelSelecionadoId} onValueChange={setResponsavelFiltro} disabled={usuariosQuery.isLoading || responsaveis.length === 0}>
                  <SelectTrigger className="sm:w-64"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={statusFiltro || todosOption} onValueChange={(value) => setStatusFiltro(value === todosOption ? "" : (value as StatusOS))}>
                <SelectTrigger className="sm:w-64">
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
              <Select
                value={prioridadeFiltro || todosOption}
                onValueChange={(value) => setPrioridadeFiltro(value === todosOption ? "" : (value as PrioridadeOS))}
              >
                <SelectTrigger className="sm:w-64">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={todosOption}>Todas as prioridades</SelectItem>
                  {prioridades.map((prioridade) => (
                    <SelectItem key={prioridade} value={prioridade}>
                      {prioridadeLabels[prioridade]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFiltro("");
                  setPrioridadeFiltro("");
                }}
              >
                Limpar filtros
              </Button>
            </CardContent>
          </Card>

          <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Prioridade de execução</CardTitle>
                <CardDescription>{podeReordenar ? "Arraste os tickets ou use as setas para definir a sequência do desenvolvedor." : "Remova os filtros de status e prioridade para reordenar a fila."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {minhasOrdens.length > 0 ? minhasOrdens.map((ordem, index) => (
                  <div key={ordem.id} onDragStart={() => setOrdemArrastadaId(ordem.id)} onDragEnd={() => setOrdemArrastadaId(null)}>
                    <OrdemCard
                      ordem={ordem}
                      reordenavel={podeReordenar}
                      atualizando={sequenciaMutation.isPending}
                      podeSubir={index > 0}
                      podeDescer={index < minhasOrdens.length - 1}
                      onMover={(deslocamento) => moverOrdem(ordem.id, index + deslocamento + 1)}
                      onDrop={(destino) => {
                        if (ordemArrastadaId && ordemArrastadaId !== destino.id) moverOrdem(ordemArrastadaId, index + 1);
                        setOrdemArrastadaId(null);
                      }}
                    />
                  </div>
                )) : <EmptyState />}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>O que fazer hoje</CardTitle>
                  <CardDescription>Vencidas e com prazo para o dia atual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...vencidas, ...hoje].length > 0 ? [...vencidas, ...hoje].slice(0, 6).map(renderOrdem) : <EmptyState />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo por prioridade</CardTitle>
                  <CardDescription>Distribuicao das seus tickets abertos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {porPrioridade.map(({ prioridade, ordens }) => (
                    <div key={prioridade} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{prioridadeLabels[prioridade]}</span>
                        <span className="font-medium">{ordens.length}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div
                          className={`h-2 rounded-full ${
                            prioridade === "CRITICA"
                              ? "bg-red-500"
                              : prioridade === "ALTA"
                                ? "bg-orange-500"
                                : prioridade === "MEDIA"
                                  ? "bg-sky-500"
                                  : "bg-emerald-500"
                          }`}
                          style={{ width: `${minhasOrdens.length ? Math.max((ordens.length / minhasOrdens.length) * 100, ordens.length > 0 ? 8 : 0) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Aguardando ação</CardTitle>
                <CardDescription>Tickets que precisam avançar de etapa ou receber alguma decisão.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {aguardandoAcao.length > 0 ? aguardandoAcao.slice(0, 6).map(renderOrdem) : <EmptyState />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Em desenvolvimento</CardTitle>
                <CardDescription>Tickets que já estão em trabalho técnico ativo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {emDesenvolvimento.length > 0 ? emDesenvolvimento.slice(0, 6).map(renderOrdem) : <EmptyState />}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </AppShell>
  );
}
