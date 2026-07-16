"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Edit,
  History,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Trash2,
  UserRound
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CriticalActionDialog } from "@/components/shared/critical-action-dialog";
import { MensagemClienteComposer } from "@/components/shared/mensagem-cliente-composer";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prioridadeLabels, statusBadgeClasses, statusLabels } from "@/lib/os-labels";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { auditoriaService } from "@/services/auditoria-service";
import { ordemServicoService } from "@/services/ordem-servico-service";
import type { AuditoriaOS, OrdemServico, PrioridadeOS, StatusOS } from "@/types";

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type OrdemServicoTab = "status" | "informacoes" | "textos" | "valores" | "auditoria";

const abas: { value: OrdemServicoTab; label: string }[] = [
  { value: "status", label: "Status e ações" },
  { value: "informacoes", label: "Informações" },
  { value: "textos", label: "Textos" },
  { value: "valores", label: "Valores" },
  { value: "auditoria", label: "Auditoria" }
];

type WorkflowAction = {
  status: StatusOS;
  label: string;
  description: string;
  primary?: boolean;
};

const workflowActions: Record<StatusOS, WorkflowAction[]> = {
  RECEBIDA: [
    {
      status: "EM_ANALISE",
      label: "Iniciar analise",
      description: "A OS entra na etapa de entendimento técnico.",
      primary: true
    }
  ],
  EM_ANALISE: [
    {
      status: "AGUARDANDO_APROVACAO",
      label: "Enviar para aprovação",
      description: "Disponibiliza a análise para decisão do cliente.",
      primary: true
    }
  ],
  AGUARDANDO_APROVACAO: [
    {
      status: "APROVADA",
      label: "Aprovar manualmente",
      description: "Registra aprovação interna quando a decisão veio por outro canal.",
      primary: true
    },
    {
      status: "EM_ANALISE",
      label: "Voltar para analise",
      description: "Reabre a análise para ajustes antes de nova aprovação."
    }
  ],
  APROVADA: [
    {
      status: "EM_DESENVOLVIMENTO",
      label: "Iniciar desenvolvimento",
      description: "Move a OS para execução técnica.",
      primary: true
    }
  ],
  EM_DESENVOLVIMENTO: [
    {
      status: "EM_TESTE",
      label: "Enviar para teste",
      description: "Sinaliza que a entrega esta pronta para validacao.",
      primary: true
    }
  ],
  EM_TESTE: [
    {
      status: "AGUARDANDO_PAGAMENTO",
      label: "Enviar para pagamento",
      description: "Conclui a validacao e libera a etapa financeira.",
      primary: true
    },
    {
      status: "EM_DESENVOLVIMENTO",
      label: "Voltar para desenvolvimento",
      description: "Retorna a OS para ajustes técnicos."
    }
  ],
  AGUARDANDO_PAGAMENTO: [
    {
      status: "FINALIZADA",
      label: "Finalizar OS",
      description: "Abre a tela para documentar entrega, branch, commits e arquivos.",
      primary: true
    },
    {
      status: "EM_DESENVOLVIMENTO",
      label: "Retomar desenvolvimento",
      description: "Reabre a execução caso ainda exista ajuste pendente."
    }
  ],
  FINALIZADA: []
};

const statusWorkflowOrder: StatusOS[] = [
  "RECEBIDA",
  "EM_ANALISE",
  "AGUARDANDO_APROVACAO",
  "APROVADA",
  "EM_DESENVOLVIMENTO",
  "EM_TESTE",
  "AGUARDANDO_PAGAMENTO",
  "FINALIZADA"
];

function formatarDataHora(data?: string) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(data));
}

function formatarValor(valor?: number) {
  return valor != null ? moeda.format(valor) : "-";
}

function CampoDetalhe({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-md border bg-secondary/30 p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-medium [overflow-wrap:anywhere]">
        {value ?? "-"}
      </div>
    </div>
  );
}

function CampoPrazo({ prazo }: { prazo?: string }) {
  return (
    <div className={`min-w-0 max-w-full overflow-hidden rounded-md border p-4 ${prazoClasses(prazo)}`}>
      <div className="text-xs font-medium uppercase">Prazo</div>
      <div className="mt-2 text-sm font-semibold">{formatarDataPrazo(prazo)}</div>
    </div>
  );
}

function obterIconeEvento(tipoEvento: string) {
  if (tipoEvento.includes("STATUS")) {
    return CheckCircle2;
  }

  if (tipoEvento.includes("PAGAMENTO")) {
    return CreditCard;
  }

  if (tipoEvento.includes("RESPONSAVEL") || tipoEvento.includes("ATRIBUID")) {
    return UserRound;
  }

  if (tipoEvento.includes("COMENTARIO") || tipoEvento.includes("CHECKLIST")) {
    return MessageSquare;
  }

  return Clock;
}

function TimelineEvento({ evento, isUltimo }: { evento: AuditoriaOS; isUltimo: boolean }) {
  const Icone = obterIconeEvento(evento.tipoEvento);

  return (
    <div className="relative flex min-w-0 gap-4 pb-6 last:pb-0">
      {!isUltimo ? <div className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-border" /> : null}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background text-primary shadow-sm">
        <Icone className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden rounded-md border bg-secondary/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{evento.tipoEvento.replaceAll("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">{evento.usuarioNome ?? "Sistema"}</span>
            </div>
            <div className="mt-2 whitespace-pre-wrap break-words text-sm font-medium [overflow-wrap:anywhere]">
              {evento.descricao}
            </div>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground">{formatarDataHora(evento.criadoEm)}</div>
        </div>
        {evento.statusAnterior || evento.statusNovo ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border bg-background px-2 py-1 text-muted-foreground">
              {evento.statusAnterior ? statusLabels[evento.statusAnterior] : "-"}
            </span>
            <span className="text-muted-foreground">para</span>
            <span className="rounded-md border bg-background px-2 py-1 font-medium">
              {evento.statusNovo ? statusLabels[evento.statusNovo] : "-"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function statusDateMap(ordem: OrdemServico, eventos: AuditoriaOS[]) {
  const datas = new Map<StatusOS, string>();
  datas.set("RECEBIDA", ordem.criadoEm);

  eventos
    .filter((evento) => evento.statusNovo)
    .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
    .forEach((evento) => {
      if (evento.statusNovo && !datas.has(evento.statusNovo)) {
        datas.set(evento.statusNovo, evento.criadoEm);
      }
    });

  if (!datas.has(ordem.status)) {
    datas.set(ordem.status, ordem.finalizadoEm ?? ordem.atualizadoEm);
  }

  return datas;
}

function StatusTimeline({ ordem, eventos }: { ordem: OrdemServico; eventos: AuditoriaOS[] }) {
  const datas = statusDateMap(ordem, eventos);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Linha do tempo do status</div>
          <p className="text-sm text-muted-foreground">
            Veja por quais etapas a OS ja passou e quais ainda faltam no fluxo padrao.
          </p>
        </div>
        <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
          Status atual: {statusLabels[ordem.status]}
        </Badge>
      </div>

      <div className="space-y-0">
        {statusWorkflowOrder.map((status, index) => {
          const data = datas.get(status);
          const isAtual = status === ordem.status;
          const isConcluido = Boolean(data) && !isAtual;
          const isPendente = !data && !isAtual;
          const isUltimo = index === statusWorkflowOrder.length - 1;

          return (
            <div key={status} className="relative flex gap-4 pb-6 last:pb-0">
              {!isUltimo ? <div className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-border" /> : null}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background",
                  isAtual ? "border-primary bg-primary text-primary-foreground" : null,
                  isConcluido ? "border-emerald-200 bg-emerald-50 text-emerald-700" : null,
                  isPendente ? "text-muted-foreground" : null
                )}
              >
                {isConcluido || isAtual ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1 rounded-md border bg-secondary/30 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{statusLabels[status]}</span>
                      {isAtual ? <Badge>Atual</Badge> : null}
                      {isConcluido ? <Badge variant="outline">Concluido</Badge> : null}
                      {isPendente ? <Badge variant="outline">Pendente</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {data ? `Registrado em ${formatarDataHora(data)}` : "Etapa ainda não alcançada."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrdemServicoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const isDesenvolvedor = usuario?.perfil === "DESENVOLVEDOR";
  const id = params.id;
  const [osEmAcao, setOsEmAcao] = useState(false);
  const [confirmacaoExclusaoOpen, setConfirmacaoExclusaoOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<OrdemServicoTab>("status");

  const detalheQueryKey = ["ordens-servico", id];
  const auditoriaQueryKey = ["auditoria", "ordens-servico", id];
  const ordensQueryKey = ["ordens-servico"];

  const ordemQuery = useQuery({
    queryKey: detalheQueryKey,
    queryFn: () => ordemServicoService.buscarPorId(id),
    enabled: Boolean(id)
  });

  const auditoriaQuery = useQuery({
    queryKey: auditoriaQueryKey,
    queryFn: () => auditoriaService.listarPorOrdemServico(id),
    enabled: Boolean(id)
  });

  const ordem = ordemQuery.data;

  const statusMutation = useMutation({
    mutationFn: ({ status, descricao }: { status: StatusOS; descricao?: string }) => {
      if (!ordem) {
        throw new Error("OS não carregada.");
      }

      return ordemServicoService.atualizarStatus(ordem.id, status, descricao);
    },
    onMutate: () => setOsEmAcao(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detalheQueryKey });
      queryClient.invalidateQueries({ queryKey: auditoriaQueryKey });
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("Status da OS atualizado.");
    },
    onError: () => {
      toast.error("Transição de status inválida ou não permitida.");
    },
    onSettled: () => setOsEmAcao(false)
  });

  const pagamentoMutation = useMutation({
    mutationFn: (paga: boolean) => {
      if (!ordem) {
        throw new Error("OS não carregada.");
      }

      return ordemServicoService.atualizarPagamento(ordem.id, paga);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detalheQueryKey });
      queryClient.invalidateQueries({ queryKey: auditoriaQueryKey });
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("Pagamento da OS atualizado.");
    },
    onError: () => {
      toast.error("Não foi possível atualizar o pagamento da OS.");
    }
  });

  const excluirMutation = useMutation({
    mutationFn: () => {
      if (!ordem) {
        throw new Error("OS não carregada.");
      }

      return ordemServicoService.excluir(ordem.id);
    },
    onMutate: () => setOsEmAcao(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      setConfirmacaoExclusaoOpen(false);
      toast.success("OS excluida com sucesso.");
      router.push("/ordens-servico");
    },
    onError: () => {
      toast.error("Não foi possível excluir a OS.");
    },
    onSettled: () => setOsEmAcao(false)
  });

  function executarAcaoWorkflow(action: WorkflowAction) {
    if (!ordem) {
      return;
    }

    if (action.status === "FINALIZADA") {
      router.push(`/ordens-servico/${ordem.id}/finalizar`);
      return;
    }

    statusMutation.mutate({ status: action.status, descricao: action.label });
  }

  function excluirOrdem() {
    setConfirmacaoExclusaoOpen(true);
  }

  function voltarParaListagem() {
    const origem = new URLSearchParams(window.location.search).get("origem");

    router.push(origem === "finalizadas" ? "/ordens-servico/finalizadas" : "/ordens-servico");
  }

  return (
    <AppShell>
      <PageHeader
        title={ordem ? `${ordem.codigo} - ${ordem.titulo}` : "Detalhes da OS"}
        description="Visualize os dados completos da ordem de serviço e acompanhe sua evolução."
        actions={
          <Button variant="outline" onClick={voltarParaListagem}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      {ordemQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : ordemQuery.isError || !ordem ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Não foi possível carregar os detalhes da OS.</span>
            <Button variant="outline" size="sm" onClick={() => ordemQuery.refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="inline-flex h-10 w-max items-center justify-center rounded-md bg-muted p-1">
                {abas.map((aba) => (
                  <button
                    key={aba.value}
                    type="button"
                    role="tab"
                    aria-selected={abaAtiva === aba.value}
                    className={cn(
                      "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                      abaAtiva === aba.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setAbaAtiva(aba.value)}
                  >
                    {aba.label}
                  </button>
                ))}
              </div>
            </div>

            {abaAtiva === "status" ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <CardTitle>Status e ações</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Avance a OS pelo fluxo permitido e acompanhe as etapas ja percorridas.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
                          {statusLabels[ordem.status]}
                        </Badge>
                        <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {workflowActions[ordem.status].length > 0 ? (
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div className="rounded-md border bg-secondary/30 p-4">
                          <div className="text-xs font-medium uppercase text-muted-foreground">Proxima acao recomendada</div>
                          <div className="mt-2 text-sm font-semibold">{workflowActions[ordem.status][0].label}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{workflowActions[ordem.status][0].description}</p>
                        </div>
                        <Button
                          className="w-full lg:w-auto"
                          disabled={osEmAcao || (isDesenvolvedor && ordem.status === "EM_ANALISE")}
                          onClick={() => executarAcaoWorkflow(workflowActions[ordem.status][0])}
                        >
                          {osEmAcao ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          {workflowActions[ordem.status][0].label}
                        </Button>
                        {isDesenvolvedor && ordem.status === "EM_ANALISE" ? (
                          <p className="text-sm text-muted-foreground lg:col-span-2">
                            Aguarde um administrador aprovar a análise para avançar esta OS.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        Esta OS está finalizada. Não existem próximas etapas operacionais disponíveis.
                      </div>
                    )}

                    {workflowActions[ordem.status].length > 1 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Outras ações disponíveis</div>
                        <div className="flex flex-wrap gap-2">
                          {workflowActions[ordem.status].slice(1).map((action) => (
                            <Button
                              key={action.status}
                              variant="outline"
                              disabled={osEmAcao}
                              onClick={() => executarAcaoWorkflow(action)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-sm text-muted-foreground">
                        Ultima atualizacao:{" "}
                        <span className="font-medium text-foreground">{formatarDataHora(ordem.atualizadoEm)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ordem.status === "EM_ANALISE" || !isDesenvolvedor ? (
                          <>
                            <Button variant="outline" onClick={() => router.push(`/ordens-servico/${ordem.id}/analise`)}>
                              <ClipboardCheck className="h-4 w-4" />
                              {ordem.status === "EM_ANALISE" ? "Analisar OS" : "Visualizar analise"}
                            </Button>
                            {!isDesenvolvedor ? (
                              <Button variant="outline" onClick={() => router.push(`/ordens-servico/${ordem.id}/editar`)}>
                                <Edit className="h-4 w-4" />
                                Editar
                              </Button>
                            ) : null}
                            {!isDesenvolvedor ? (
                              <Button variant="destructive" disabled={osEmAcao} onClick={excluirOrdem}>
                                {osEmAcao ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Excluir
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Historico de status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {auditoriaQuery.isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : auditoriaQuery.isError ? (
                      <div className="flex flex-col gap-3 rounded-md border bg-secondary/30 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>Não foi possível carregar o histórico de status desta OS.</span>
                        <Button variant="outline" size="sm" onClick={() => auditoriaQuery.refetch()}>
                          <RefreshCcw className="h-4 w-4" />
                          Tentar novamente
                        </Button>
                      </div>
                    ) : (
                      <StatusTimeline ordem={ordem} eventos={auditoriaQuery.data ?? []} />
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {abaAtiva === "informacoes" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Informações da OS</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <CampoDetalhe label="Numero da OS" value={ordem.codigo} />
                  <CampoDetalhe label="Título" value={ordem.titulo} />
                  <CampoDetalhe label="Cliente" value={ordem.clienteNome} />
                  <CampoDetalhe label="Projeto" value={ordem.projetoNome || "Sem projeto"} />
                  <CampoDetalhe label="Responsável" value={ordem.responsavelNome || "A definir"} />
                  <CampoPrazo prazo={ordem.prazo} />
                  <CampoDetalhe label="Criada em" value={formatarDataHora(ordem.criadoEm)} />
                  <CampoDetalhe label="Atualizada em" value={formatarDataHora(ordem.atualizadoEm)} />
                  <CampoDetalhe label="Finalizada em" value={formatarDataHora(ordem.finalizadoEm)} />
                </CardContent>
              </Card>
            ) : null}

            {abaAtiva === "textos" ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Descrição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CampoDetalhe label="Descrição da solicitação" value={ordem.descricao} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Análise técnica</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <CampoDetalhe label="Texto da analise" value={ordem.entendimento} />
                    </div>
                  </CardContent>
                </Card>

                {ordem.status === "FINALIZADA" || ordem.descricaoFinalizacao ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Finalizacao</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <CampoDetalhe label="O que foi feito" value={ordem.descricaoFinalizacao} />
                      </div>
                      <CampoDetalhe label="Branch" value={ordem.branchFinalizacao} />
                      <CampoDetalhe label="Commits ou links" value={ordem.commitsFinalizacao} />
                      <div className="md:col-span-2">
                        <CampoDetalhe label="Arquivos alterados" value={ordem.arquivosAlteradosFinalizacao} />
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {!isDesenvolvedor ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Mensagem ao cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MensagemClienteComposer />
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {abaAtiva === "valores" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Valores</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <CampoDetalhe
                    label="Horas estimadas"
                    value={ordem.estimativaHoras != null ? `${ordem.estimativaHoras}h` : "Sem estimativa"}
                  />
                  <CampoDetalhe label="Cobrança" value={ordem.cobrar === false ? "Não cobrar" : "Cobrar"} />
                  <CampoDetalhe label="Valor total estimado" value={formatarValor(ordem.valorTotalEstimado)} />
                  <label className="flex items-start gap-3 rounded-md border bg-secondary/30 p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      checked={Boolean(ordem.paga)}
                      disabled={isDesenvolvedor || pagamentoMutation.isPending || ordem.cobrar === false}
                      onChange={(event) => pagamentoMutation.mutate(event.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-medium">OS paga</span>
                      <span className="block text-sm text-muted-foreground">
                        Marque quando o pagamento desta ordem de serviço já tiver sido recebido.
                      </span>
                    </span>
                  </label>
                </CardContent>
              </Card>
            ) : null}

            {abaAtiva === "auditoria" ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Trilha de auditoria</CardTitle>
                  <History className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {auditoriaQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : auditoriaQuery.isError ? (
                    <div className="flex flex-col gap-3 rounded-md border bg-secondary/30 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>Não foi possível carregar a auditoria desta OS.</span>
                      <Button variant="outline" size="sm" onClick={() => auditoriaQuery.refetch()}>
                        <RefreshCcw className="h-4 w-4" />
                        Tentar novamente
                      </Button>
                    </div>
                  ) : (auditoriaQuery.data ?? []).length === 0 ? (
                    <div className="rounded-md border bg-secondary/30 p-4 text-sm text-muted-foreground">
                      Nenhum evento de auditoria registrado.
                    </div>
                  ) : (
                    <div>
                      {(auditoriaQuery.data ?? []).map((evento, index, eventos) => (
                        <TimelineEvento key={evento.id} evento={evento} isUltimo={index === eventos.length - 1} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <CriticalActionDialog
        open={confirmacaoExclusaoOpen}
        title="Excluir ordem de servico?"
        description="Esta exclusao e definitiva. Revise os impactos antes de continuar."
        itemName={ordem ? `${ordem.codigo} - ${ordem.titulo}` : ""}
        impacts={["A ordem de servico deixara de estar disponivel nas listagens e consultas.", "Os dados associados a esta OS nao poderao ser recuperados pela aplicacao."]}
        confirmLabel="Excluir definitivamente"
        isPending={excluirMutation.isPending}
        onConfirm={() => ordem && excluirMutation.mutate()}
        onOpenChange={setConfirmacaoExclusaoOpen}
      />
    </AppShell>
  );
}
