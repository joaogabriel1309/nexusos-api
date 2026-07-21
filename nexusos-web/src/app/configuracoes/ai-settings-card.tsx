"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { configuracaoIAService } from "@/services/configuracao-ia-service";
import type { ConfiguracaoIAPayload } from "@/types/configuracao-ia";

const key = ["configuracoes", "ia"] as const;
const vazio: ConfiguracaoIAPayload = { habilitado: false, apiUrl: "https://api.openai.com/v1/chat/completions", modelo: "gpt-4o-mini", temperatura: 0.2, apiKey: null };
export function AISettingsCard() {
  const client = useQueryClient(); const [form, setForm] = useState(vazio);
  const query = useQuery({ queryKey: key, queryFn: configuracaoIAService.buscar });
  useEffect(() => { if (query.data) setForm({ ...query.data, apiKey: null }); }, [query.data]);
  const mutation = useMutation({ mutationFn: configuracaoIAService.atualizar, onSuccess: data => {
    client.setQueryData(key, data); setForm({ ...data, apiKey: null }); toast.success("Configuração de IA salva.");
  }, onError: () => toast.error("Não foi possível salvar a configuração de IA.") });
  const set = <K extends keyof ConfiguracaoIAPayload>(campo: K, valor: ConfiguracaoIAPayload[K]) => setForm(f => ({ ...f, [campo]: valor }));
  if (query.isLoading) return <Skeleton className="h-80 w-full" />;
  return <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />OpenAI / IA</CardTitle><p className="text-sm text-muted-foreground">Configure a geração de textos e análise das ordens de serviço.</p></div><Badge variant={query.data?.chaveConfigurada ? "success" : "warning"}>{query.data?.chaveConfigurada ? "Chave configurada" : "Sem chave"}</Badge></CardHeader><CardContent><form className="space-y-5" onSubmit={(e: FormEvent) => { e.preventDefault(); mutation.mutate(form); }}>
    <label className="flex items-center justify-between rounded-md border p-4"><span><span className="block text-sm font-medium">Ativar assistente de IA</span><span className="block text-xs text-muted-foreground">Os dados da OS serão enviados ao provedor somente ao solicitar uma análise.</span></span><input aria-label="Ativar assistente de IA" type="checkbox" className="h-5 w-5 accent-primary" checked={form.habilitado} onChange={e => set("habilitado", e.target.checked)} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="URL da API"><Input type="url" value={form.apiUrl} onChange={e => set("apiUrl", e.target.value)} required /></Field><Field label="Modelo"><Input value={form.modelo} onChange={e => set("modelo", e.target.value)} required /></Field><Field label="Chave da API"><Input type="password" autoComplete="new-password" value={form.apiKey ?? ""} placeholder={query.data?.chaveConfigurada ? "Preencha somente para substituir" : "sk-..."} onChange={e => set("apiKey", e.target.value)} /></Field><Field label={`Temperatura (${form.temperatura})`}><Input type="range" min="0" max="2" step="0.1" value={form.temperatura} onChange={e => set("temperatura", Number(e.target.value))} /></Field></div>
    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configuração de IA</Button>
  </form></CardContent></Card>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }
