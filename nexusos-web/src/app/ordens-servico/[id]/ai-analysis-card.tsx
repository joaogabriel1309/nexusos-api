"use client";
import { useMutation } from "@tanstack/react-query";
import { Bot, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ordemServicoService } from "@/services/ordem-servico-service";

export function AIAnalysisCard({ ordemId }: { ordemId: string }) {
  const mutation = useMutation({ mutationFn: () => ordemServicoService.analisarComIA(ordemId), onError: () => toast.error("Não foi possível gerar a análise. Verifique a configuração de IA.") });
  const copiar = async (texto: string) => { await navigator.clipboard.writeText(texto); toast.success("Texto copiado."); };
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Assistente de IA</CardTitle><p className="text-sm text-muted-foreground">Gere sugestões com base nos dados e apontamentos atuais. Revise antes de usar.</p></CardHeader><CardContent className="space-y-4">
    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{mutation.data ? "Gerar novamente" : "Gerar análise"}</Button>
    {mutation.data ? <div className="grid gap-4 md:grid-cols-2"><Resultado titulo="Resumo técnico" texto={mutation.data.resumoTecnico} copiar={copiar} /><Resultado titulo="Descrição para o cliente" texto={mutation.data.descricaoCliente} copiar={copiar} /><Resultado titulo="Risco de atraso" texto={mutation.data.riscoAtraso} copiar={copiar} /><Resultado titulo="Texto de entrega final" texto={mutation.data.textoEntregaFinal} copiar={copiar} /><div className="rounded-md border p-4 md:col-span-2"><div className="text-xs font-medium uppercase text-muted-foreground">Prioridade sugerida</div><Badge className="mt-2">{mutation.data.prioridadeSugerida}</Badge></div></div> : null}
  </CardContent></Card>;
}
function Resultado({ titulo, texto, copiar }: { titulo: string; texto: string; copiar: (texto: string) => void }) { return <div className="rounded-md border bg-secondary/20 p-4"><div className="flex items-center justify-between gap-2"><div className="text-xs font-medium uppercase text-muted-foreground">{titulo}</div><Button type="button" variant="ghost" size="sm" aria-label={`Copiar ${titulo}`} onClick={() => copiar(texto)}><Copy className="h-4 w-4" /></Button></div><p className="mt-2 whitespace-pre-wrap text-sm">{texto}</p></div>; }
