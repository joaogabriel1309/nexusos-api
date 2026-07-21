"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, File, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ordemServicoService } from "@/services/ordem-servico-service";
import { portalClienteService } from "@/services/portal-cliente-service";
import type { Anexo } from "@/types";

type Props = { ordemId: string; token?: string; podeExcluir?: boolean };

export function CentralAnexos({ ordemId, token, podeExcluir = false }: Props) {
  const queryClient = useQueryClient();
  const chave = ["anexos", token ?? "equipe", ordemId];
  const [arquivo, setArquivo] = useState<File>();
  const [descricao, setDescricao] = useState("");
  const query = useQuery({
    queryKey: chave,
    queryFn: () => token ? portalClienteService.listarAnexos(token, ordemId) : ordemServicoService.listarAnexos(ordemId)
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!arquivo) throw new Error("Selecione um arquivo.");
      return token ? portalClienteService.enviarAnexo(token, ordemId, arquivo, descricao) : ordemServicoService.enviarAnexo(ordemId, arquivo, descricao);
    },
    onSuccess: () => { setArquivo(undefined); setDescricao(""); queryClient.invalidateQueries({ queryKey: chave }); toast.success("Anexo enviado."); },
    onError: () => toast.error("Não foi possível enviar. Confira tipo, tamanho e limite de anexos.")
  });
  const excluir = useMutation({
    mutationFn: (id: string) => ordemServicoService.excluirAnexo(ordemId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chave }),
    onError: () => toast.error("Não foi possível excluir o anexo.")
  });
  const baixar = (anexo: Anexo) => token ? portalClienteService.baixarAnexo(token, ordemId, anexo) : ordemServicoService.baixarAnexo(ordemId, anexo);

  return <Card className="min-w-0 overflow-hidden">
    <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Central de anexos</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-secondary/20 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="space-y-1 text-sm font-medium">Arquivo
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx" className="block w-full text-sm" onChange={(e) => setArquivo(e.target.files?.[0])} />
        </label>
        <label className="space-y-1 text-sm font-medium">Descrição (opcional)
          <input value={descricao} maxLength={255} onChange={(e) => setDescricao(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3" />
        </label>
        <Button disabled={!arquivo || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Enviar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">PDF, imagens, texto e documentos Office. Até 10 MB por arquivo e 20 anexos por OS.</p>
      {query.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : query.isError ? <p className="text-sm text-destructive">Não foi possível carregar os anexos.</p> : query.data?.length ? (
        <div className="divide-y rounded-md border">{query.data.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-3 p-3">
          <File className="h-5 w-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{item.nomeArquivo}</div><div className="text-xs text-muted-foreground">{item.descricao || (item.enviadoPeloCliente ? "Enviado pelo cliente" : "Enviado pela equipe")} · {(item.tamanho / 1024).toFixed(1)} KB</div></div>
          <Button size="sm" variant="outline" onClick={() => baixar(item)}><Download className="h-4 w-4" /><span className="sr-only">Baixar</span></Button>
          {podeExcluir ? <Button size="sm" variant="destructive" disabled={excluir.isPending} onClick={() => excluir.mutate(item.id)}><Trash2 className="h-4 w-4" /><span className="sr-only">Excluir</span></Button> : null}
        </div>)}</div>
      ) : <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>}
    </CardContent>
  </Card>;
}
