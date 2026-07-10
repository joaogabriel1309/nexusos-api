"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, Edit, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { OrdemServicoAnaliseForm } from "@/components/shared/ordem-servico-analise-form";
import { OrdemServicoForm } from "@/components/shared/ordem-servico-form";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { prioridadeLabels, statusBadgeClasses, statusLabels, statusOptions } from "@/lib/os-labels";
import { formatarDataPrazo, prazoClasses } from "@/lib/prazo";
import { useAuth } from "@/providers/auth-provider";
import type { OrdemServicoAnaliseFormData } from "@/schemas/ordem-servico-analise-schema";
import type { OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
import { clienteService } from "@/services/cliente-service";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { projetoService } from "@/services/projeto-service";
import { usuarioService } from "@/services/usuario-service";
import type { PrioridadeOS, StatusOS } from "@/types";

function prioridadeVariant(prioridade: PrioridadeOS): BadgeProps["variant"] {
  if (prioridade === "CRITICA") return "danger";
  if (prioridade === "ALTA") return "warning";
  if (prioridade === "MEDIA") return "secondary";
  return "outline";
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
    <div className="rounded-md border bg-secondary/30 p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm font-medium">{value ?? "-"}</div>
    </div>
  );
}

function CampoPrazo({ prazo }: { prazo?: string }) {
  return (
    <div className={`rounded-md border p-4 ${prazoClasses(prazo)}`}>
      <div className="text-xs font-medium uppercase">Prazo</div>
      <div className="mt-2 text-sm font-semibold">{formatarDataPrazo(prazo)}</div>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analiseDialogOpen, setAnaliseDialogOpen] = useState(false);
  const [osEmAcao, setOsEmAcao] = useState(false);

  const detalheQueryKey = ["ordens-servico", id];
  const ordensQueryKey = ["ordens-servico"];

  const ordemQuery = useQuery({
    queryKey: detalheQueryKey,
    queryFn: () => ordemServicoService.buscarPorId(id),
    enabled: Boolean(id)
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: clienteService.listar,
    enabled: !isDesenvolvedor
  });

  const projetosQuery = useQuery({
    queryKey: ["projetos"],
    queryFn: projetoService.listar,
    enabled: !isDesenvolvedor
  });

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: usuarioService.listar,
    enabled: !isDesenvolvedor
  });

  const ordem = ordemQuery.data;
  const clientes = useMemo(() => (clientesQuery.data ?? []).filter((cliente) => cliente.ativo), [clientesQuery.data]);
  const projetos = useMemo(() => (projetosQuery.data ?? []).filter((projeto) => projeto.ativo), [projetosQuery.data]);
  const responsaveis = useMemo(
    () => (usuariosQuery.data ?? []).filter((usuario) => usuario.ativo && usuario.perfil !== "CLIENTE"),
    [usuariosQuery.data]
  );
  const valorHoraAnalise = useMemo(() => {
    if (isDesenvolvedor) {
      return 0;
    }

    if (!ordem) {
      return 0;
    }

    return clientes.find((cliente) => cliente.id === ordem.clienteId)?.valorHora ?? 0;
  }, [clientes, isDesenvolvedor, ordem]);

  const salvarMutation = useMutation({
    mutationFn: (data: OrdemServicoFormData) => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return ordemServicoService.atualizar(ordem.id, {
        ...data,
        entendimento: ordem.entendimento,
        impacto: ordem.impacto,
        riscos: ordem.riscos,
        estimativaHoras: ordem.estimativaHoras ?? null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detalheQueryKey });
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      setDialogOpen(false);
      toast.success("OS atualizada com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel salvar a OS.");
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, descricao }: { status: StatusOS; descricao?: string }) => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return ordemServicoService.atualizarStatus(ordem.id, status, descricao);
    },
    onMutate: () => setOsEmAcao(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detalheQueryKey });
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("Status da OS atualizado.");
    },
    onError: () => {
      toast.error("Transicao de status invalida ou nao permitida.");
    },
    onSettled: () => setOsEmAcao(false)
  });

  const analiseMutation = useMutation({
    mutationFn: (data: OrdemServicoAnaliseFormData) => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return ordemServicoService.atualizarAnalise(ordem.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detalheQueryKey });
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      setAnaliseDialogOpen(false);
      toast.success("Analise da OS salva com sucesso.");
    },
    onError: () => {
      toast.error("Nao foi possivel salvar a analise da OS.");
    }
  });

  const pagamentoMutation = useMutation({
    mutationFn: (paga: boolean) => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return ordemServicoService.atualizarPagamento(ordem.id, paga);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detalheQueryKey });
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("Pagamento da OS atualizado.");
    },
    onError: () => {
      toast.error("Nao foi possivel atualizar o pagamento da OS.");
    }
  });

  const excluirMutation = useMutation({
    mutationFn: () => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return ordemServicoService.excluir(ordem.id);
    },
    onMutate: () => setOsEmAcao(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordensQueryKey });
      toast.success("OS excluida com sucesso.");
      router.push("/ordens-servico");
    },
    onError: () => {
      toast.error("Nao foi possivel excluir a OS.");
    },
    onSettled: () => setOsEmAcao(false)
  });

  function atualizarStatus(status: StatusOS) {
    if (!ordem || status === ordem.status) {
      return;
    }

    if (status === "FINALIZADA") {
      const descricao = window.prompt("Informe o que foi feito para finalizar a OS:");

      if (!descricao?.trim()) {
        toast.error("Informe o que foi feito antes de finalizar a OS.");
        return;
      }

      statusMutation.mutate({ status, descricao: descricao.trim() });
      return;
    }

    statusMutation.mutate({ status });
  }

  function excluirOrdem() {
    if (!ordem || !window.confirm(`Excluir a OS ${ordem.titulo}?`)) {
      return;
    }

    excluirMutation.mutate();
  }

  return (
    <AppShell>
      <PageHeader
        title={ordem ? `n° ${ordem.codigo} - ${ordem.titulo}` : "Detalhes da OS"}
        description="Visualize os dados completos da ordem de servico e acompanhe sua evolucao."
        actions={
          <Button variant="outline" onClick={() => router.push("/ordens-servico")}>
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
            <span>Nao foi possivel carregar os detalhes da OS.</span>
            <Button variant="outline" size="sm" onClick={() => ordemQuery.refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
                  {statusLabels[ordem.status]}
                </Badge>
                <Badge variant={prioridadeVariant(ordem.prioridade)}>{prioridadeLabels[ordem.prioridade]}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={ordem.status} disabled={osEmAcao} onValueChange={(status) => atualizarStatus(status as StatusOS)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isDesenvolvedor ? (
                  <>
                    <Button variant="outline" onClick={() => setAnaliseDialogOpen(true)}>
                      <ClipboardCheck className="h-4 w-4" />
                      {ordem.status === "EM_ANALISE" ? "Analisar OS" : "Visualizar analise"}
                    </Button>
                    <Button variant="outline" onClick={() => setDialogOpen(true)}>
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="destructive" disabled={osEmAcao} onClick={excluirOrdem}>
                      {osEmAcao ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Excluir
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Informacoes da OS</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <CampoDetalhe label="Numero da OS" value={`n° ${ordem.codigo}`} />
                <CampoDetalhe label="Titulo" value={ordem.titulo} />
                <CampoDetalhe label="Cliente" value={ordem.clienteNome} />
                <CampoDetalhe label="Projeto" value={ordem.projetoNome || "Sem projeto"} />
                <CampoDetalhe label="Responsavel" value={ordem.responsavelNome || "A definir"} />
                <CampoPrazo prazo={ordem.prazo} />
                <CampoDetalhe label="Criada em" value={formatarDataHora(ordem.criadoEm)} />
                <CampoDetalhe label="Atualizada em" value={formatarDataHora(ordem.atualizadoEm)} />
                <CampoDetalhe label="Finalizada em" value={formatarDataHora(ordem.finalizadoEm)} />
                <div className="md:col-span-2">
                  <CampoDetalhe label="Descricao" value={ordem.descricao} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CampoDetalhe
                  label="Horas estimadas"
                  value={ordem.estimativaHoras != null ? `${ordem.estimativaHoras}h` : "Sem estimativa"}
                />
                <CampoDetalhe label="Cobranca" value={ordem.cobrar === false ? "Nao cobrar" : "Cobrar"} />
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
                      Marque quando o pagamento desta ordem de servico ja tiver sido recebido.
                    </span>
                  </span>
                </label>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analise tecnica</CardTitle>
            </CardHeader>
            <CardContent>
              <CampoDetalhe label="Texto da Analise" value={ordem.entendimento} />
            </CardContent>
          </Card>

          {ordem.status === "FINALIZADA" || ordem.descricaoFinalizacao ? (
            <Card>
              <CardHeader>
                <CardTitle>Finalizacao</CardTitle>
              </CardHeader>
              <CardContent>
                <CampoDetalhe label="O que foi feito" value={ordem.descricaoFinalizacao} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {ordem && !isDesenvolvedor ? (
        <>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Editar OS</DialogTitle>
                <DialogDescription>Atualize os dados principais da ordem de servico.</DialogDescription>
              </DialogHeader>
              <OrdemServicoForm
                clientes={clientes}
                responsaveis={responsaveis}
                projetos={projetos}
                ordem={ordem}
                isSubmitting={salvarMutation.isPending}
                onSubmit={(data) => salvarMutation.mutate(data)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={analiseDialogOpen} onOpenChange={setAnaliseDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{ordem.status === "EM_ANALISE" ? "Analisar OS" : "Visualizar analise"}</DialogTitle>
                <DialogDescription>
                  {ordem.status === "EM_ANALISE"
                    ? "Informe a estimativa de horas para calcular o valor previsto da ordem de servico."
                    : "Consulte os dados de analise registrados para esta ordem de servico."}
                </DialogDescription>
              </DialogHeader>
              <OrdemServicoAnaliseForm
                ordem={ordem}
                valorHora={valorHoraAnalise}
                isSubmitting={analiseMutation.isPending}
                readOnly={ordem.status !== "EM_ANALISE"}
                onSubmit={(data) => analiseMutation.mutate(data)}
              />
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </AppShell>
  );
}
