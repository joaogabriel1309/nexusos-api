"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ArrowLeft, CheckCircle2, Copy, CreditCard, Loader2, QrCode, RefreshCcw, SearchCheck, XCircle } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/shared/table-pagination";
import { CentralAnexos } from "@/components/shared/central-anexos";
import { PortalNavigation } from "@/components/portal/portal-navigation";
import { statusBadgeClasses } from "@/lib/os-labels";
import { portalClienteService } from "@/services/portal-cliente-service";
import type { PagamentoPixResponse, PortalOrdemServico, StatusOS } from "@/types";

const todosStatusOption = "__todos__";
const todosProjetosOption = "__todos_projetos__";
const ordemStatusFluxo: StatusOS[] = [
  "RECEBIDA",
  "EM_ANALISE",
  "AGUARDANDO_APROVACAO",
  "APROVADA",
  "EM_DESENVOLVIMENTO",
  "EM_TESTE",
  "AGUARDANDO_PAGAMENTO",
  "FINALIZADA"
];
const indiceAguardandoAprovacao = ordemStatusFluxo.indexOf("AGUARDANDO_APROVACAO");
const itensPorPagina = 20;

const portalStatus: Record<StatusOS, { label: string; orientacao: string }> = {
  RECEBIDA: {
    label: "Pedido recebido",
    orientacao: "Recebemos seu pedido. Nossa equipe vai avaliar as informações enviadas."
  },
  EM_ANALISE: {
    label: "Estamos avaliando",
    orientacao: "Nossa equipe está avaliando o pedido e preparando os próximos passos."
  },
  AGUARDANDO_APROVACAO: {
    label: "Sua aprovação é necessária",
    orientacao: "Revise a proposta e autorize o início do trabalho ou peça as alterações necessárias."
  },
  APROVADA: {
    label: "Aprovada por você",
    orientacao: "Sua aprovação foi registrada. A equipe vai iniciar o trabalho."
  },
  EM_DESENVOLVIMENTO: {
    label: "Trabalho em andamento",
    orientacao: "A equipe está executando o trabalho aprovado. Nenhuma ação sua é necessária agora."
  },
  EM_TESTE: {
    label: "Em revisão final",
    orientacao: "O trabalho está sendo conferido antes da entrega. Nenhuma ação sua é necessária agora."
  },
  AGUARDANDO_PAGAMENTO: {
    label: "Pagamento necessário",
    orientacao: "O trabalho foi concluído. Faça o pagamento para finalizar este pedido."
  },
  FINALIZADA: {
    label: "Serviço concluído",
    orientacao: "Este pedido foi concluído e não exige nenhuma ação."
  },
  CANCELADA: {
    label: "Pedido cancelado",
    orientacao: "Este pedido foi cancelado e não seguirá para as próximas etapas."
  }
};

const portalStatusOptions = Object.keys(portalStatus) as StatusOS[];

type ApiErrorResponse = {
  mensagem?: string;
  message?: string;
};

function mensagemErro(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.mensagem ?? axiosError.response?.data?.message ?? fallback;
}

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
  return `${ordem.codigo} - ${ordem.titulo || ordem.descricao}`;
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarValor(valor?: number) {
  return valor != null ? moeda.format(valor) : "-";
}

function PagamentoBadge({ paga }: { paga?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        paga
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
    >
      {paga ? "Pago" : "Pendente"}
    </Badge>
  );
}

function podeIniciarPagamento(ordem: PortalOrdemServico) {
  return (
    ordem.pagamentoDisponivel !== false &&
    !ordem.paga &&
    (ordem.valorTotalEstimado ?? 0) > 0 &&
    ordem.status !== "RECEBIDA" &&
    ordem.status !== "EM_ANALISE"
  );
}

function pagamentoAprovadoNoRetorno(searchParams: ReturnType<typeof useSearchParams>) {
  return (
    searchParams.get("pagamento") === "sucesso" ||
    searchParams.get("status") === "approved" ||
    searchParams.get("collection_status") === "approved"
  );
}

function pagamentoPendenteNoRetorno(searchParams: ReturnType<typeof useSearchParams>) {
  return searchParams.get("pagamento") === "pendente" || searchParams.get("status") === "pending";
}

function pagamentoFalhouNoRetorno(searchParams: ReturnType<typeof useSearchParams>) {
  return (
    searchParams.get("pagamento") === "falha" ||
    searchParams.get("status") === "failure" ||
    searchParams.get("collection_status") === "rejected"
  );
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

export default function PortalClientePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = params.token;
  const queryClient = useQueryClient();
  const pagamentoRetornoProcessado = useRef(false);
  const [codigoFiltro, setCodigoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "">("");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [ordemSelecionada, setOrdemSelecionada] = useState<PortalOrdemServico | null>(null);
  const [pixPagamento, setPixPagamento] = useState<PagamentoPixResponse | null>(null);
  const [dialogAjusteAberto, setDialogAjusteAberto] = useState(false);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const queryKey = ["portal-cliente", token];
  const portalQuery = useQuery({
    queryKey,
    queryFn: () => portalClienteService.listarOrdens(token),
    enabled: Boolean(token)
  });

  const decisaoMutation = useMutation({
    mutationFn: ({ ordemId, aprovado, motivo }: { ordemId: string; aprovado: boolean; motivo?: string }) => {
      return aprovado
        ? portalClienteService.aprovar(token, ordemId)
        : portalClienteService.reprovar(token, ordemId, motivo ?? "");
    },
    onSuccess: (ordemAtualizada, variaveis) => {
      queryClient.invalidateQueries({ queryKey });
      setOrdemSelecionada(ordemAtualizada);
      setDialogAjusteAberto(false);
      setMotivoAjuste("");
      toast.success(variaveis.aprovado ? "Trabalho autorizado. A equipe já pode começar." : "Pedido de alteração enviado à equipe.");
    },
    onError: (error) => {
      toast.error(mensagemErro(error, "Não foi possível registrar sua decisão. Tente novamente."));
    }
  });

  const pagamentoMutation = useMutation({
    mutationFn: (ordemId: string) => portalClienteService.iniciarPagamento(token, ordemId),
    onSuccess: (checkout) => {
      window.location.href = checkout.checkoutUrl;
    },
    onError: (error) => {
      toast.error(mensagemErro(error, "Não foi possível abrir o pagamento. Tente novamente."));
    }
  });

  const pixMutation = useMutation({
    mutationFn: (ordemId: string) => portalClienteService.gerarPix(token, ordemId),
    onSuccess: (pix) => {
      setPixPagamento(pix);
      setOrdemSelecionada((ordem) => (ordem ? { ...ordem, pagamentoIniciado: true } : ordem));
      queryClient.invalidateQueries({ queryKey });
      toast.success("Pix pronto para pagamento.");
    },
    onError: (error) => {
      toast.error(mensagemErro(error, "Não foi possível gerar o Pix. Tente novamente."));
    }
  });

  const confirmarPagamentoMutation = useMutation({
    mutationFn: ({ ordemId, paymentId }: { ordemId: string; paymentId: string }) => {
      return portalClienteService.confirmarPagamento(token, ordemId, paymentId);
    },
    onSuccess: (ordemAtualizada) => {
      queryClient.invalidateQueries({ queryKey });
      setOrdemSelecionada(ordemAtualizada);
      toast.success("Pagamento confirmado com sucesso.");
      router.replace(`/portal/cliente/${token}`);
    },
    onError: (error) => {
      toast.error(mensagemErro(error, "O pagamento foi aprovado, mas a atualização ainda não foi concluída."));
    }
  });

  const verificarPagamentoMutation = useMutation({
    mutationFn: (ordemId: string) => portalClienteService.verificarPagamento(token, ordemId),
    onSuccess: (ordemAtualizada) => {
      queryClient.invalidateQueries({ queryKey });
      setOrdemSelecionada(ordemAtualizada);
      toast.success("Pagamento confirmado com sucesso.");
    },
    onError: (error) => {
      toast.error(mensagemErro(error, "Ainda não encontramos a confirmação. Aguarde um instante e tente novamente."));
    }
  });

  useEffect(() => {
    if (pagamentoRetornoProcessado.current) {
      return;
    }

    const ordemId = searchParams.get("os") ?? searchParams.get("external_reference");
    const paymentId = searchParams.get("payment_id") ?? searchParams.get("collection_id");

    if (pagamentoAprovadoNoRetorno(searchParams) && ordemId && paymentId) {
      pagamentoRetornoProcessado.current = true;
      confirmarPagamentoMutation.mutate({ ordemId, paymentId });
    } else if (pagamentoAprovadoNoRetorno(searchParams)) {
      pagamentoRetornoProcessado.current = true;
      toast.warning("O pagamento foi aprovado, mas a atualização ainda não foi concluída.");
      router.replace(`/portal/cliente/${token}`);
    } else if (pagamentoPendenteNoRetorno(searchParams)) {
      pagamentoRetornoProcessado.current = true;
      toast.info("Pagamento em processamento. Esta página será atualizada após a confirmação.");
      router.replace(`/portal/cliente/${token}`);
    } else if (pagamentoFalhouNoRetorno(searchParams)) {
      pagamentoRetornoProcessado.current = true;
      toast.error("O pagamento não foi aprovado. Você pode tentar novamente.");
      router.replace(`/portal/cliente/${token}`);
    }
  }, [confirmarPagamentoMutation, router, searchParams, token]);

  const ordensFiltradas = useMemo(() => {
    const ordens = portalQuery.data?.ordens ?? [];
    const codigoBusca = codigoFiltro.trim();
    return ordens
      .filter((ordem) => {
        const matchCodigo = codigoBusca ? String(ordem.codigo).includes(codigoBusca) : true;
        const matchStatus = statusFiltro ? ordem.status === statusFiltro : true;
        const matchProjeto = projetoFiltro ? ordem.projetoId === projetoFiltro : true;
        return matchCodigo && matchStatus && matchProjeto;
      })
      .sort((a, b) => ordemStatusFluxo.indexOf(a.status) - ordemStatusFluxo.indexOf(b.status));
  }, [codigoFiltro, portalQuery.data?.ordens, projetoFiltro, statusFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(ordensFiltradas.length / itensPorPagina));
  const ordensPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return ordensFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [ordensFiltradas, paginaAtual]);

  const projetos = useMemo(() => {
    const mapa = new Map<string, string>();

    for (const ordem of portalQuery.data?.ordens ?? []) {
      if (ordem.projetoId && ordem.projetoNome) {
        mapa.set(ordem.projetoId, ordem.projetoNome);
      }
    }

    return Array.from(mapa.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [portalQuery.data?.ordens]);

  const totais = useMemo(() => {
    return ordensFiltradas.reduce(
      (total, ordem) => {
        const valor = ordem.valorTotalEstimado ?? 0;
        const indiceStatus = ordemStatusFluxo.indexOf(ordem.status);

        if (ordem.paga) {
          total.pago += valor;
        }
        else if (indiceStatus > indiceAguardandoAprovacao) {
          total.aPagar += valor;
        }

        return total;
      },
      { aPagar: 0, pago: 0 }
    );
  }, [ordensFiltradas]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [codigoFiltro, projetoFiltro, statusFiltro]);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (!ticketId || !portalQuery.data) return;
    const ticket = portalQuery.data.ordens.find((ordem) => ordem.id === ticketId);
    if (ticket) {
      setOrdemSelecionada(ticket);
      router.replace(`/portal/cliente/${token}`);
    }
  }, [portalQuery.data, router, searchParams, token]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
        <header className="min-w-0 space-y-2">
          <div className="text-sm font-semibold text-primary">NexusOS</div>
          <h1 className="break-words text-2xl font-semibold tracking-normal [overflow-wrap:anywhere]">Portal do Cliente</h1>
          <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
            Veja o andamento dos seus pedidos, saiba quando precisa agir e acompanhe pagamentos em um só lugar.
          </p>
        </header>

        <PortalNavigation token={token} active="tickets" />

        {ordemSelecionada ? (
          <Card className="min-w-0 max-w-full overflow-hidden">
            <CardHeader className="space-y-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="break-words [overflow-wrap:anywhere]">
                    {`${ordemSelecionada.codigo} - ${ordemSelecionada.titulo}`}
                  </CardTitle>
                  <p className="mt-1 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    Acompanhe o que foi solicitado, os valores e o próximo passo.
                  </p>
                </div>
                <Button className="shrink-0" variant="outline" onClick={() => setOrdemSelecionada(null)}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={statusBadgeClasses[ordemSelecionada.status]}>
                  {portalStatus[ordemSelecionada.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-5">
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle>O que acontece agora</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {portalStatus[ordemSelecionada.status].orientacao}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle>Resumo do pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="whitespace-pre-wrap break-words font-medium">
                    {ordemSelecionada.descricaoFinalizacao || ordemSelecionada.textoAnalise || ordemSelecionada.descricao}
                  </p>
                  <p className="text-muted-foreground">
                    Confira abaixo o pedido, a proposta da equipe e, quando disponível, o que foi entregue.
                  </p>
                </CardContent>
              </Card>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <CampoDetalhe label="Número do pedido" value={ordemSelecionada.codigo} />
                <CampoDetalhe label="Projeto" value={ordemSelecionada.projetoNome || "Sem projeto vinculado"} />
                <CampoDetalhe label="Pedido enviado em" value={formatarDataHora(ordemSelecionada.criadoEm)} />
                <CampoDetalhe label="Concluído em" value={formatarDataHora(ordemSelecionada.finalizadoEm)} />
                <div className="min-w-0 md:col-span-2">
                  <CampoDetalhe label="O que você solicitou" value={ordemSelecionada.descricao} />
                </div>
                <div className="min-w-0 md:col-span-2">
                  <CampoDetalhe label="Proposta da equipe" value={ordemSelecionada.textoAnalise} />
                </div>
                {ordemSelecionada.descricaoFinalizacao || ordemSelecionada.finalizadoEm ? (
                  <div className="min-w-0 md:col-span-2">
                    <CampoDetalhe label="O que foi feito" value={ordemSelecionada.descricaoFinalizacao} />
                  </div>
                ) : null}
              </div>

              <CentralAnexos ordemId={ordemSelecionada.id} token={token} />

              <Card className="min-w-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Valores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <CampoDetalhe label="Valor total" value={formatarValor(ordemSelecionada.valorTotalEstimado)} />
                    <CampoDetalhe label="Pagamento" value={ordemSelecionada.paga ? "Pago" : "A pagar"} />
                  </div>
                  {podeIniciarPagamento(ordemSelecionada) ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {ordemSelecionada.pagamentoIniciado ? (
                        <Button
                          variant="outline"
                          disabled={verificarPagamentoMutation.isPending}
                          onClick={() => verificarPagamentoMutation.mutate(ordemSelecionada.id)}
                        >
                          {verificarPagamentoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SearchCheck className="h-4 w-4" />
                          )}
                          Já paguei, verificar
                        </Button>
                      ) : null}
                      <Button
                        disabled={pagamentoMutation.isPending}
                        onClick={() => pagamentoMutation.mutate(ordemSelecionada.id)}
                      >
                        {pagamentoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Pagar com cartão
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={pixMutation.isPending}
                        onClick={() => pixMutation.mutate(ordemSelecionada.id)}
                      >
                        {pixMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        Pagar com Pix
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {ordemSelecionada.status === "AGUARDANDO_APROVACAO" ? (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle>Revise e escolha uma opção</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Autorize o início do trabalho se estiver de acordo com a proposta. Se precisar mudar algo, explique o ajuste para a equipe revisar.
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        disabled={decisaoMutation.isPending}
                        onClick={() => setDialogAjusteAberto(true)}
                      >
                        <XCircle className="h-4 w-4" />
                        Pedir alterações
                      </Button>
                      <Button
                        disabled={decisaoMutation.isPending}
                        onClick={() => decisaoMutation.mutate({ ordemId: ordemSelecionada.id, aprovado: true })}
                      >
                        {decisaoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Autorizar início do trabalho
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {!ordemSelecionada ? (
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
                <span>Não foi possível abrir este portal. Confira o link ou tente novamente.</span>
                <Button variant="outline" size="sm" onClick={() => portalQuery.refetch()}>
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Cliente</div>
                    <div className="text-lg font-semibold">{portalQuery.data?.clienteNome}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      inputMode="numeric"
                      placeholder="Número do pedido"
                      value={codigoFiltro}
                      onChange={(event) => setCodigoFiltro(event.target.value.replace(/\D/g, ""))}
                      className="sm:w-[180px]"
                    />
                    <Select
                      value={projetoFiltro || todosProjetosOption}
                      onValueChange={(value) => setProjetoFiltro(value === todosProjetosOption ? "" : value)}
                    >
                      <SelectTrigger className="sm:w-[240px]">
                        <SelectValue placeholder="Filtrar por projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={todosProjetosOption}>Todos os projetos</SelectItem>
                        {projetos.map((projeto) => (
                          <SelectItem key={projeto.id} value={projeto.id}>
                            {projeto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={statusFiltro || todosStatusOption}
                      onValueChange={(value) => setStatusFiltro(value === todosStatusOption ? "" : (value as StatusOS))}
                    >
                      <SelectTrigger className="sm:w-[240px]">
                        <SelectValue placeholder="Filtrar por etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={todosStatusOption}>Todas as etapas</SelectItem>
                        {portalStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {portalStatus[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border bg-secondary/30 p-4">
                    <div className="text-sm text-muted-foreground">Valor a pagar</div>
                    <div className="mt-1 text-2xl font-semibold text-amber-700">{formatarValor(totais.aPagar)}</div>
                  </div>
                  <div className="rounded-md border bg-secondary/30 p-4">
                    <div className="text-sm text-muted-foreground">Valor pago</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-700">{formatarValor(totais.pago)}</div>
                  </div>
                </div>

                {ordensFiltradas.length === 0 ? (
                  <div className="rounded-md border bg-secondary/30 p-5 text-sm text-muted-foreground">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:hidden">
                      {ordensPaginadas.map((ordem) => (
                        <div
                          key={ordem.id}
                          role="button"
                          tabIndex={0}
                          className="min-w-0 max-w-full overflow-hidden rounded-md border bg-background p-4 text-left shadow-sm transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setOrdemSelecionada(ordem)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setOrdemSelecionada(ordem);
                            }
                          }}
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium" title={`${ordem.codigo}`}>
                                {descricaoCurta(ordem)}
                              </div>
                              <div className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]" title={ordem.descricao}>
                                {ordem.descricao}
                              </div>
                            </div>
                            <Badge variant="outline" className={`shrink-0 ${statusBadgeClasses[ordem.status]}`}>
                              {portalStatus[ordem.status].label}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <PagamentoBadge paga={ordem.paga} />
                            <div className="font-medium">{formatarValor(ordem.valorTotalEstimado)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Etapa atual</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ordensPaginadas.map((ordem) => (
                            <TableRow
                              key={ordem.id}
                              className="cursor-pointer"
                              onClick={() => setOrdemSelecionada(ordem)}
                            >
                              <TableCell>
                                <div className="max-w-[360px]">
                                  <div className="truncate font-medium" title={`${ordem.codigo}`}>
                                    {descricaoCurta(ordem)}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground" title={ordem.descricao}>
                                    {ordem.descricao}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusBadgeClasses[ordem.status]}>
                                  {portalStatus[ordem.status].label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <PagamentoBadge paga={ordem.paga} />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatarValor(ordem.valorTotalEstimado)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination
                      page={paginaAtual}
                      totalItems={ordensFiltradas.length}
                      pageSize={itensPorPagina}
                      onPageChange={setPaginaAtual}
                    />
                  </>
                )}
              </div>
            )}
            </CardContent>
          </Card>
        ) : null}

        <Dialog open={Boolean(pixPagamento)} onOpenChange={(open) => !open && setPixPagamento(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pagamento Pix</DialogTitle>
              <DialogDescription>Escaneie o QR Code ou use o Pix copia e cola no app do seu banco.</DialogDescription>
            </DialogHeader>
            {pixPagamento ? (
              <div className="space-y-4">
                {pixPagamento.qrCodeBase64 ? (
                  <div className="flex justify-center rounded-md border bg-white p-4">
                    <Image
                      src={`data:image/png;base64,${pixPagamento.qrCodeBase64}`}
                      alt="QR Code Pix"
                      width={224}
                      height={224}
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Pix copia e cola</div>
                  <Textarea readOnly value={pixPagamento.qrCode} className="min-h-32 resize-none text-xs" />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {pixPagamento.ticketUrl ? (
                    <Button variant="outline" asChild>
                      <a href={pixPagamento.ticketUrl} target="_blank" rel="noreferrer">
                        Abrir Pix
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(pixPagamento.qrCode);
                      toast.success("Código Pix copiado.");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar código Pix
                  </Button>
                  {ordemSelecionada ? (
                    <Button
                      disabled={verificarPagamentoMutation.isPending}
                      onClick={() => verificarPagamentoMutation.mutate(ordemSelecionada.id)}
                    >
                      {verificarPagamentoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SearchCheck className="h-4 w-4" />
                      )}
                      Já paguei, verificar
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={dialogAjusteAberto} onOpenChange={setDialogAjusteAberto}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pedir alterações</DialogTitle>
              <DialogDescription>
                Explique o que precisa mudar. A equipe receberá sua mensagem e revisará a proposta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="motivo-ajuste" className="text-sm font-medium">O que precisa mudar?</label>
              <Textarea
                id="motivo-ajuste"
                value={motivoAjuste}
                maxLength={2000}
                className="min-h-32 resize-y"
                placeholder="Descreva de forma objetiva o que precisa ser alterado."
                onChange={(event) => setMotivoAjuste(event.target.value)}
              />
              <div className="text-right text-xs text-muted-foreground">{motivoAjuste.length}/2000</div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={decisaoMutation.isPending} onClick={() => setDialogAjusteAberto(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={decisaoMutation.isPending || !motivoAjuste.trim() || !ordemSelecionada}
                onClick={() => ordemSelecionada && decisaoMutation.mutate({
                  ordemId: ordemSelecionada.id,
                  aprovado: false,
                  motivo: motivoAjuste.trim()
                })}
              >
                {decisaoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Enviar pedido de alteração
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Proteja este acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Este link dá acesso aos seus pedidos e pagamentos. Não o compartilhe com outras pessoas.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
