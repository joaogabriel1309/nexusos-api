"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Files, TicketCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { prioridadeLabels, prioridadeOptions } from "@/lib/os-labels";
import { protocoloSolicitacao } from "@/lib/solicitacao-labels";
import { projetoService } from "@/services/projeto-service";
import { solicitacaoService } from "@/services/solicitacao-service";
import { usuarioService } from "@/services/usuario-service";
import type { PrioridadeOS } from "@/types";

const nenhum = "NENHUM";

export default function ConverterSolicitacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const solicitacaoQuery = useQuery({ queryKey: ["solicitacoes", id], queryFn: () => solicitacaoService.buscar(id) });
  const usuariosQuery = useQuery({ queryKey: ["usuarios"], queryFn: usuarioService.listar });
  const projetosQuery = useQuery({ queryKey: ["projetos"], queryFn: projetoService.listar });
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavelId, setResponsavelId] = useState(nenhum);
  const [projetoId, setProjetoId] = useState(nenhum);
  const [prioridade, setPrioridade] = useState<PrioridadeOS>("MEDIA");
  const [prazo, setPrazo] = useState("");
  const [preenchido, setPreenchido] = useState(false);

  useEffect(() => {
    if (!solicitacaoQuery.data || preenchido) return;
    const solicitacao = solicitacaoQuery.data.solicitacao;
    setTitulo(solicitacao.titulo);
    setDescricao(solicitacao.descricao);
    setPrioridade(solicitacao.prioridade ?? "MEDIA");
    setPreenchido(true);
  }, [preenchido, solicitacaoQuery.data]);

  const mutation = useMutation({
    mutationFn: () => solicitacaoService.converter(id, {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      responsavelId: responsavelId === nenhum ? undefined : responsavelId,
      projetoId: projetoId === nenhum ? undefined : projetoId,
      prioridade,
      prazo: prazo || undefined
    }),
    onSuccess: (dados) => {
      queryClient.setQueryData(["solicitacoes", id], dados);
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
      queryClient.invalidateQueries({ queryKey: ["solicitacoes", "resumo"] });
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      toast.success("Solicitação convertida em Ticket.");
      if (dados.solicitacao.ticketId) router.push(`/ordens-servico/${dados.solicitacao.ticketId}?origem=solicitacoes`);
      else router.push(`/solicitacoes/${id}`);
    },
    onError: () => toast.error("Não foi possível criar o Ticket.")
  });

  if (solicitacaoQuery.isLoading) return <AppShell><Skeleton className="h-24" /><Skeleton className="mt-5 h-[520px]" /></AppShell>;
  if (!solicitacaoQuery.data) return <AppShell><p>Solicitação não encontrada.</p></AppShell>;
  const detalhe = solicitacaoQuery.data;
  const solicitacao = detalhe.solicitacao;
  const projetos = (projetosQuery.data ?? []).filter((projeto) => projeto.ativo && projeto.clienteId === solicitacao.clienteId);

  return (
    <AppShell>
      <PageHeader
        title="Criar Ticket a partir da solicitação"
        description={`${protocoloSolicitacao(solicitacao.codigo)} · Revise os dados antes de confirmar.`}
        actions={<Button variant="outline" asChild><Link href={`/solicitacoes/${id}`}><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader><CardTitle>Dados do novo Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2"><label htmlFor="titulo-ticket" className="text-sm font-medium">Título</label><Input id="titulo-ticket" value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={180} /></div>
            <div className="space-y-2"><label htmlFor="descricao-ticket" className="text-sm font-medium">Descrição</label><Textarea id="descricao-ticket" value={descricao} onChange={(event) => setDescricao(event.target.value)} className="min-h-40" maxLength={10000} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium">Responsável</label><Select value={responsavelId} onValueChange={setResponsavelId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={nenhum}>Usar configuração padrão</SelectItem>{(usuariosQuery.data ?? []).filter((usuario) => usuario.ativo).map((usuario) => <SelectItem key={usuario.id} value={usuario.id}>{usuario.nome}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Projeto</label><Select value={projetoId} onValueChange={setProjetoId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={nenhum}>Sem projeto</SelectItem>{projetos.map((projeto) => <SelectItem key={projeto.id} value={projeto.id}>{projeto.nome}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Prioridade interna</label><Select value={prioridade} onValueChange={(value) => setPrioridade(value as PrioridadeOS)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{prioridadeOptions.map((item) => <SelectItem key={item} value={item}>{prioridadeLabels[item]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label htmlFor="prazo-ticket" className="text-sm font-medium">Prazo opcional</label><Input id="prazo-ticket" type="date" value={prazo} onChange={(event) => setPrazo(event.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader><CardTitle>O que será copiado</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Cliente, assunto e descrição da solicitação.</p>
              <div className="flex items-center gap-2"><Files className="h-4 w-4" /><span>{detalhe.anexos.length} anexo(s)</span></div>
              <p>O vínculo com {protocoloSolicitacao(solicitacao.codigo)} será preservado para consulta.</p>
            </CardContent>
          </Card>
          <Button className="w-full" size="lg" disabled={!titulo.trim() || !descricao.trim() || mutation.isPending} onClick={() => mutation.mutate()}><TicketCheck className="h-5 w-5" />{mutation.isPending ? "Criando Ticket..." : "Confirmar e criar Ticket"}</Button>
        </div>
      </div>
    </AppShell>
  );
}
