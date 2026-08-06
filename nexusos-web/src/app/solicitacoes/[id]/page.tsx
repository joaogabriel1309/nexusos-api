"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, MessageSquare, RefreshCcw, TicketCheck, UserCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { prioridadeLabels } from "@/lib/os-labels";
import {
  motivoRejeicaoLabels,
  protocoloSolicitacao,
  solicitacaoStatusClasses,
  solicitacaoStatusLabels
} from "@/lib/solicitacao-labels";
import { cn } from "@/lib/utils";
import { solicitacaoService } from "@/services/solicitacao-service";
import { usuarioService } from "@/services/usuario-service";
import type { MotivoRejeicaoSolicitacao, SolicitacaoDetalhe } from "@/types";

const semResponsavel = "SEM_RESPONSAVEL";

function dataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data));
}

function tamanhoArquivo(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SolicitacaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [pergunta, setPergunta] = useState("");
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);
  const [motivo, setMotivo] = useState<MotivoRejeicaoSolicitacao>("FORA_ESCOPO");
  const [detalheRejeicao, setDetalheRejeicao] = useState("");

  const queryKey = ["solicitacoes", id];
  const query = useQuery({ queryKey, queryFn: () => solicitacaoService.buscar(id), refetchInterval: 10_000 });
  const usuariosQuery = useQuery({ queryKey: ["usuarios"], queryFn: usuarioService.listar });

  function atualizar(dados: SolicitacaoDetalhe, mensagem: string) {
    queryClient.setQueryData(queryKey, dados);
    queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
    queryClient.invalidateQueries({ queryKey: ["solicitacoes", "resumo"] });
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    toast.success(mensagem);
  }

  const assumirMutation = useMutation({
    mutationFn: () => solicitacaoService.assumir(id),
    onSuccess: (dados) => atualizar(dados, "Solicitação atribuída a você."),
    onError: () => toast.error("Não foi possível assumir a solicitação.")
  });
  const responsavelMutation = useMutation({
    mutationFn: (responsavelId?: string) => solicitacaoService.atualizarResponsavel(id, responsavelId),
    onSuccess: (dados) => atualizar(dados, "Responsável atualizado."),
    onError: () => toast.error("Não foi possível atualizar o responsável.")
  });
  const esclarecimentoMutation = useMutation({
    mutationFn: () => solicitacaoService.solicitarEsclarecimentos(id, pergunta),
    onSuccess: (dados) => { setPergunta(""); atualizar(dados, "Pergunta enviada ao cliente."); },
    onError: () => toast.error("Não foi possível enviar a pergunta.")
  });
  const rejeicaoMutation = useMutation({
    mutationFn: () => solicitacaoService.rejeitar(id, motivo, detalheRejeicao),
    onSuccess: (dados) => { setMostrarRejeicao(false); atualizar(dados, "Solicitação rejeitada."); },
    onError: () => toast.error("Não foi possível rejeitar a solicitação.")
  });

  if (query.isLoading) {
    return <AppShell><Skeleton className="h-24" /><Skeleton className="mt-5 h-[520px]" /></AppShell>;
  }
  if (query.isError || !query.data) {
    return <AppShell><Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p>Não foi possível carregar a solicitação.</p><Button variant="outline" onClick={() => query.refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></CardContent></Card></AppShell>;
  }

  const detalhe = query.data;
  const solicitacao = detalhe.solicitacao;
  const encerrada = solicitacao.status === "REJEITADA" || solicitacao.status === "CONVERTIDA_EM_TICKET";
  const anexosIniciais = detalhe.anexos.filter((anexo) => !anexo.interacaoId);

  return (
    <AppShell>
      <PageHeader
        title={`${protocoloSolicitacao(solicitacao.codigo)} · ${solicitacao.titulo}`}
        description={`${solicitacao.clienteNome} · Atualizada em ${dataHora(solicitacao.atualizadoEm)}`}
        actions={<Button variant="outline" asChild><Link href="/solicitacoes"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`whitespace-nowrap ${solicitacaoStatusClasses[solicitacao.status]}`}>{solicitacaoStatusLabels[solicitacao.status]}</Badge>
        {solicitacao.prioridade ? <Badge variant="secondary">Urgência {prioridadeLabels[solicitacao.prioridade]}</Badge> : null}
        {solicitacao.ticketId ? <Button size="sm" variant="outline" asChild><Link href={`/ordens-servico/${solicitacao.ticketId}?origem=solicitacoes`}><TicketCheck className="h-4 w-4" />Ticket #{solicitacao.ticketCodigo}</Link></Button> : null}
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Tabs defaultValue="conversa" className="min-w-0">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="conversa">Conversa</TabsTrigger>
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="conversa" className="space-y-3">
            {detalhe.interacoes.map((interacao) => {
              const anexos = detalhe.anexos.filter((anexo) => anexo.interacaoId === interacao.id);
              return (
                <div key={interacao.id} className={cn("rounded-md border p-4", interacao.origem === "CLIENTE" && "border-sky-200 bg-sky-50/60", interacao.origem === "EQUIPE" && "border-indigo-200 bg-indigo-50/60", interacao.origem === "SISTEMA" && "bg-muted/40")}>
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{interacao.autorNome}</p><time className="text-xs text-muted-foreground">{dataHora(interacao.criadoEm)}</time></div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{interacao.mensagem}</p>
                  {anexos.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{anexos.map((anexo) => <Button key={anexo.id} size="sm" variant="outline" onClick={() => solicitacaoService.baixarAnexo(id, anexo)}><Download className="h-4 w-4" />{anexo.nomeArquivo}</Button>)}</div> : null}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="informacoes" className="space-y-4">
            <Card><CardHeader><CardTitle>Pedido do cliente</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{solicitacao.descricao}</p></CardContent></Card>
            {detalhe.detalheRejeicao ? <Card className="border-red-200"><CardHeader><CardTitle>Motivo do encerramento</CardTitle></CardHeader><CardContent className="space-y-2"><Badge variant="outline">{detalhe.motivoRejeicao ? motivoRejeicaoLabels[detalhe.motivoRejeicao] : "Rejeitada"}</Badge><p className="text-sm">{detalhe.detalheRejeicao}</p></CardContent></Card> : null}
            <Card><CardHeader><CardTitle>Anexos enviados</CardTitle></CardHeader><CardContent>{anexosIniciais.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum anexo enviado no cadastro.</p> : <div className="space-y-2">{anexosIniciais.map((anexo) => <button key={anexo.id} type="button" onClick={() => solicitacaoService.baixarAnexo(id, anexo)} className="flex w-full min-w-0 items-center gap-3 rounded-md border p-3 text-left hover:bg-secondary/40"><FileText className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{anexo.nomeArquivo}</span><span className="shrink-0 text-xs text-muted-foreground">{tamanhoArquivo(anexo.tamanho)}</span><Download className="h-4 w-4 shrink-0" /></button>)}</div>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="auditoria">
            <Card><CardContent className="space-y-4 p-5">{detalhe.auditoria.map((evento) => <div key={evento.id} className="border-l-2 pl-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{evento.tipoEvento.replaceAll("_", " ")}</p><time className="text-xs text-muted-foreground">{dataHora(evento.criadoEm)}</time></div><p className="mt-1 text-sm text-muted-foreground">{evento.descricao}</p></div>)}</CardContent></Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader><CardTitle>Responsável pela triagem</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={solicitacao.responsavelId ?? semResponsavel} disabled={encerrada || responsavelMutation.isPending} onValueChange={(value) => responsavelMutation.mutate(value === semResponsavel ? undefined : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={semResponsavel}>Sem responsável</SelectItem>{(usuariosQuery.data ?? []).filter((usuario) => usuario.ativo && usuario.perfil === "ADMIN").map((usuario) => <SelectItem key={usuario.id} value={usuario.id}>{usuario.nome}</SelectItem>)}</SelectContent>
              </Select>
              {!encerrada ? <Button variant="outline" className="w-full" disabled={assumirMutation.isPending} onClick={() => assumirMutation.mutate()}><UserCheck className="h-4 w-4" />Assumir solicitação</Button> : null}
            </CardContent>
          </Card>

          {!encerrada ? (
            <Card>
              <CardHeader><CardTitle>Próxima ação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><label htmlFor="pergunta-cliente" className="text-sm font-medium">Pedir mais informações</label><Textarea id="pergunta-cliente" value={pergunta} onChange={(event) => setPergunta(event.target.value)} placeholder="Escreva uma pergunta clara para o cliente" maxLength={5000} /></div>
                <Button className="w-full" disabled={!pergunta.trim() || esclarecimentoMutation.isPending} onClick={() => esclarecimentoMutation.mutate()}><MessageSquare className="h-4 w-4" />Solicitar esclarecimentos</Button>
                <Button className="w-full" variant="outline" asChild><Link href={`/solicitacoes/${id}/converter`}><TicketCheck className="h-4 w-4" />Criar Ticket</Link></Button>
                <Button className="w-full" variant="ghost" onClick={() => setMostrarRejeicao((atual) => !atual)}><XCircle className="h-4 w-4" />Rejeitar solicitação</Button>
                {mostrarRejeicao ? <div className="space-y-3 rounded-md border border-red-200 bg-red-50/50 p-3"><Select value={motivo} onValueChange={(value) => setMotivo(value as MotivoRejeicaoSolicitacao)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(motivoRejeicaoLabels) as MotivoRejeicaoSolicitacao[]).map((item) => <SelectItem key={item} value={item}>{motivoRejeicaoLabels[item]}</SelectItem>)}</SelectContent></Select><Textarea value={detalheRejeicao} onChange={(event) => setDetalheRejeicao(event.target.value)} placeholder="Explique o motivo ao cliente" maxLength={2000} /><Button variant="destructive" className="w-full" disabled={!detalheRejeicao.trim() || rejeicaoMutation.isPending} onClick={() => rejeicaoMutation.mutate()}>Confirmar rejeição</Button></div> : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
