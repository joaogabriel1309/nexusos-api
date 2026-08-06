"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Download, FileText, Paperclip, RefreshCcw, Send, TicketCheck, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { PortalNavigation } from "@/components/portal/portal-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  motivoRejeicaoLabels,
  protocoloSolicitacao,
  solicitacaoStatusClasses,
  solicitacaoStatusClienteLabels
} from "@/lib/solicitacao-labels";
import { cn } from "@/lib/utils";
import { portalSolicitacaoService } from "@/services/solicitacao-service";

const orientacoes = {
  NOVA: "Recebemos seu pedido. A equipe fará a primeira avaliação.",
  EM_ANALISE: "A equipe está avaliando as informações enviadas.",
  AGUARDANDO_CLIENTE: "A equipe enviou uma pergunta. Responda abaixo para continuar.",
  REJEITADA: "A avaliação foi encerrada. Consulte o motivo informado pela equipe.",
  CONVERTIDA_EM_TICKET: "Seu pedido foi aceito e agora seguirá pelo fluxo de Tickets."
} as const;

function dataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data));
}

function tamanhoArquivo(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SolicitacaoPortalDetalhePage() {
  const { token, id } = useParams<{ token: string; id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [mensagem, setMensagem] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const queryKey = ["portal-solicitacoes", token, id];
  const query = useQuery({ queryKey, queryFn: () => portalSolicitacaoService.buscar(token, id), refetchInterval: 10_000 });
  const mutation = useMutation({
    mutationFn: () => portalSolicitacaoService.responder(token, id, mensagem.trim(), arquivos),
    onSuccess: (dados) => {
      queryClient.setQueryData(queryKey, dados);
      queryClient.invalidateQueries({ queryKey: ["portal-solicitacoes", token] });
      setMensagem(""); setArquivos([]);
      toast.success("Resposta enviada à equipe.");
    },
    onError: () => toast.error("Não foi possível enviar sua resposta.")
  });

  function selecionarArquivos(event: ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(event.target.files ?? []).filter((arquivo) => arquivo.size <= 10 * 1024 * 1024);
    setArquivos((atuais) => [...atuais, ...selecionados].slice(0, 5));
    event.target.value = "";
  }

  function enviar(event: FormEvent) {
    event.preventDefault();
    if (mensagem.trim()) mutation.mutate();
  }

  if (query.isLoading) return <main className="min-h-screen px-4 py-8"><div className="mx-auto max-w-5xl"><Skeleton className="h-28" /><Skeleton className="mt-6 h-[520px]" /></div></main>;
  if (query.isError || !query.data) return <main className="min-h-screen px-4 py-8"><Card className="mx-auto max-w-3xl"><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p>Não foi possível abrir esta solicitação.</p><Button variant="outline" onClick={() => query.refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></CardContent></Card></main>;

  const detalhe = query.data;
  const solicitacao = detalhe.solicitacao;
  const encerrada = solicitacao.status === "REJEITADA" || solicitacao.status === "CONVERTIDA_EM_TICKET";
  const anexosIniciais = detalhe.anexos.filter((anexo) => !anexo.interacaoId);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 py-7 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2"><div className="text-sm font-semibold text-primary">NexusOS</div><h1 className="break-words text-2xl font-semibold [overflow-wrap:anywhere]">{solicitacao.titulo}</h1><p className="text-sm text-muted-foreground">{protocoloSolicitacao(solicitacao.codigo)} · Enviada em {dataHora(solicitacao.criadoEm)}</p></header>
        <PortalNavigation token={token} active="solicitacoes" />
        {searchParams.get("nova") === "1" ? <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Solicitação enviada com sucesso</p><p className="mt-1 text-sm">Guarde o protocolo {protocoloSolicitacao(solicitacao.codigo)} para referência.</p></div></div> : null}

        <Card className={cn(solicitacao.status === "AGUARDANDO_CLIENTE" && "border-amber-300")}>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={`whitespace-nowrap ${solicitacaoStatusClasses[solicitacao.status]}`}>{solicitacaoStatusClienteLabels[solicitacao.status]}</Badge>{solicitacao.ticketCodigo ? <Badge variant="secondary">Ticket #{solicitacao.ticketCodigo}</Badge> : null}</div><p className="mt-3 text-sm">{orientacoes[solicitacao.status]}</p></div>
            {solicitacao.ticketId ? <Button className="shrink-0" asChild><Link href={`/portal/cliente/${token}?ticket=${solicitacao.ticketId}`}><TicketCheck className="h-4 w-4" />Acompanhar Ticket</Link></Button> : null}
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-3">
            <h2 className="text-lg font-semibold">Histórico da solicitação</h2>
            <Card><CardContent className="p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Pedido enviado</p><p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{solicitacao.descricao}</p>{anexosIniciais.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{anexosIniciais.map((anexo) => <Button key={anexo.id} size="sm" variant="outline" onClick={() => portalSolicitacaoService.baixarAnexo(token, id, anexo)}><Download className="h-4 w-4" />{anexo.nomeArquivo}</Button>)}</div> : null}</CardContent></Card>
            {detalhe.interacoes.map((interacao) => {
              const anexos = detalhe.anexos.filter((anexo) => anexo.interacaoId === interacao.id);
              return <div key={interacao.id} className={cn("rounded-md border p-4", interacao.origem === "CLIENTE" && "border-sky-200 bg-sky-50/60", interacao.origem === "EQUIPE" && "border-indigo-200 bg-indigo-50/60", interacao.origem === "SISTEMA" && "bg-muted/40")}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{interacao.autorNome}</p><time className="text-xs text-muted-foreground">{dataHora(interacao.criadoEm)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{interacao.mensagem}</p>{anexos.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{anexos.map((anexo) => <Button key={anexo.id} size="sm" variant="outline" onClick={() => portalSolicitacaoService.baixarAnexo(token, id, anexo)}><Download className="h-4 w-4" />{anexo.nomeArquivo}</Button>)}</div> : null}</div>;
            })}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {detalhe.detalheRejeicao ? <Card className="border-red-200"><CardHeader><CardTitle>Por que foi encerrada?</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm font-medium">{detalhe.motivoRejeicao ? motivoRejeicaoLabels[detalhe.motivoRejeicao] : "Solicitação encerrada"}</p><p className="text-sm text-muted-foreground">{detalhe.detalheRejeicao}</p></CardContent></Card> : null}
            {!encerrada ? <Card><CardHeader><CardTitle>Responder à equipe</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={enviar}><Textarea value={mensagem} onChange={(event) => setMensagem(event.target.value)} placeholder="Escreva sua resposta ou acrescente uma informação" maxLength={5000} className="min-h-32" />{arquivos.length > 0 ? <div className="space-y-2">{arquivos.map((arquivo) => <div key={`${arquivo.name}-${arquivo.lastModified}`} className="flex min-w-0 items-center gap-2 rounded border p-2"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-xs">{arquivo.name}</span><span className="text-xs text-muted-foreground">{tamanhoArquivo(arquivo.size)}</span><Button type="button" size="icon" variant="ghost" title="Remover arquivo" onClick={() => setArquivos((atuais) => atuais.filter((item) => item !== arquivo))}><Trash2 className="h-4 w-4" /></Button></div>)}</div> : null}<div className="flex flex-col gap-2"><Button type="button" variant="outline" asChild><label className="cursor-pointer"><Paperclip className="h-4 w-4" />Anexar arquivos<input type="file" multiple className="sr-only" onChange={selecionarArquivos} accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx" /></label></Button><Button type="submit" disabled={!mensagem.trim() || mutation.isPending}><Send className="h-4 w-4" />{mutation.isPending ? "Enviando..." : "Enviar resposta"}</Button></div></form></CardContent></Card> : null}
            <Button variant="outline" className="w-full" asChild><Link href={`/portal/cliente/${token}/solicitacoes`}><ArrowLeft className="h-4 w-4" />Voltar às solicitações</Link></Button>
          </div>
        </div>
      </div>
    </main>
  );
}
