"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2, Paperclip, Send, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { PortalNavigation } from "@/components/portal/portal-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { portalSolicitacaoService } from "@/services/solicitacao-service";
import type { PrioridadeOS } from "@/types";

const naoInformada = "NAO_INFORMADA";
const extensoes = new Set(["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xls", "xlsx"]);

function tamanho(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function NovaSolicitacaoPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeOS | typeof naoInformada>(naoInformada);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivos, setErroArquivos] = useState("");

  const mutation = useMutation({
    mutationFn: () => portalSolicitacaoService.criar(token, {
      titulo: titulo.trim(), descricao: descricao.trim(),
      prioridade: prioridade === naoInformada ? undefined : prioridade,
      arquivos
    }),
    onSuccess: (dados) => {
      queryClient.invalidateQueries({ queryKey: ["portal-solicitacoes", token] });
      router.push(`/portal/cliente/${token}/solicitacoes/${dados.solicitacao.id}?nova=1`);
    },
    onError: () => toast.error("Não foi possível enviar a solicitação. Revise os dados e tente novamente.")
  });

  function selecionarArquivos(event: ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(event.target.files ?? []);
    const invalidos = selecionados.filter((arquivo) => {
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
      return arquivo.size > 10 * 1024 * 1024 || !extensoes.has(extensao);
    });
    const validos = selecionados.filter((arquivo) => !invalidos.includes(arquivo));
    const novos = [...arquivos, ...validos].slice(0, 5);
    setArquivos(novos);
    setErroArquivos(invalidos.length > 0 ? "Alguns arquivos foram ignorados por tipo ou tamanho." : arquivos.length + validos.length > 5 ? "Envie no máximo 5 arquivos." : "");
    event.target.value = "";
  }

  function enviar(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;
    mutation.mutate();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 py-7 sm:py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2"><div className="text-sm font-semibold text-primary">NexusOS</div><h1 className="text-2xl font-semibold">Nova solicitação</h1><p className="text-sm text-muted-foreground">Conte o que você precisa. A equipe avaliará antes de criar um Ticket.</p></header>
        <PortalNavigation token={token} active="nova" />

        <form onSubmit={enviar}>
          <Card>
            <CardHeader><CardTitle>O que você precisa?</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><label htmlFor="assunto" className="text-sm font-medium">Assunto</label><Input id="assunto" value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ex.: Adicionar uma nova opção no cadastro" maxLength={180} required /><p className="text-xs text-muted-foreground">Use uma frase curta para identificar o pedido.</p></div>
              <div className="space-y-2"><label htmlFor="descricao" className="text-sm font-medium">Descrição detalhada</label><Textarea id="descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Explique o resultado esperado e por que ele é necessário." className="min-h-44" maxLength={10000} required /><p className="text-right text-xs text-muted-foreground">{descricao.length}/10000</p></div>
              <div className="space-y-2"><label className="text-sm font-medium">Urgência percebida <span className="font-normal text-muted-foreground">(opcional)</span></label><Select value={prioridade} onValueChange={(value) => setPrioridade(value as PrioridadeOS | typeof naoInformada)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={naoInformada}>Prefiro não informar</SelectItem><SelectItem value="BAIXA">Baixa · pode aguardar</SelectItem><SelectItem value="MEDIA">Média · necessária em breve</SelectItem><SelectItem value="ALTA">Alta · está afetando o trabalho</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">A equipe confirmará a prioridade durante a avaliação.</p></div>
              <div className="space-y-3"><div><p className="text-sm font-medium">Anexos</p><p className="mt-1 text-xs text-muted-foreground">Até 5 arquivos de 10 MB: PDF, imagens, documentos, planilhas ou texto.</p></div><label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center transition-colors hover:bg-secondary/40"><Paperclip className="h-5 w-5" /><span className="text-sm font-medium">Selecionar arquivos</span><input type="file" multiple className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx" onChange={selecionarArquivos} /></label>{erroArquivos ? <p className="text-sm text-destructive" role="alert">{erroArquivos}</p> : null}{arquivos.length > 0 ? <div className="space-y-2">{arquivos.map((arquivo) => <div key={`${arquivo.name}-${arquivo.lastModified}`} className="flex min-w-0 items-center gap-3 rounded-md border p-3"><FilePlus2 className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm">{arquivo.name}</span><span className="shrink-0 text-xs text-muted-foreground">{tamanho(arquivo.size)}</span><Button type="button" variant="ghost" size="icon" title={`Remover ${arquivo.name}`} onClick={() => setArquivos((atuais) => atuais.filter((item) => item !== arquivo))}><Trash2 className="h-4 w-4" /><span className="sr-only">Remover arquivo</span></Button></div>)}</div> : null}</div>
              <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" asChild><Link href={`/portal/cliente/${token}/solicitacoes`}><ArrowLeft className="h-4 w-4" />Cancelar</Link></Button><Button type="submit" disabled={!titulo.trim() || !descricao.trim() || mutation.isPending}><Send className="h-4 w-4" />{mutation.isPending ? "Enviando..." : "Enviar solicitação"}</Button></div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
}
