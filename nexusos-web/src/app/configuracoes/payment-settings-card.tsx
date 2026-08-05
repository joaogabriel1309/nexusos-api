"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { configuracaoPagamentoService } from "@/services/configuracao-pagamento-service";
import type { ConfiguracaoPagamentoPayload } from "@/types/configuracao-pagamento";

const queryKey = ["configuracoes", "pagamento"] as const;

export function PaymentSettingsCard() {
  const client = useQueryClient();
  const query = useQuery({ queryKey, queryFn: configuracaoPagamentoService.buscar });
  const [form, setForm] = useState<ConfiguracaoPagamentoPayload | null>(null);
  const [tokenConfigurado, setTokenConfigurado] = useState(false);
  useEffect(() => {
    if (!query.data) return;
    setForm({ mercadoPagoToken: null, mercadoPagoChavePublica: query.data.mercadoPagoChavePublica,
      expiracaoLinkMinutos: query.data.expiracaoLinkMinutos,
      cobrarAutomaticamenteOsFinalizada: query.data.cobrarAutomaticamenteOsFinalizada,
      permitirOsSemCobranca: query.data.permitirOsSemCobranca });
    setTokenConfigurado(query.data.mercadoPagoTokenConfigurado);
  }, [query.data]);
  const mutation = useMutation({ mutationFn: configuracaoPagamentoService.atualizar, onSuccess: (data) => {
    client.setQueryData(queryKey, data); setTokenConfigurado(data.mercadoPagoTokenConfigurado);
    setForm((atual) => atual ? { ...atual, mercadoPagoToken: null } : atual);
    toast.success("Configurações de pagamento salvas.");
  }, onError: () => toast.error("Não foi possível salvar as configurações de pagamento.") });
  if (query.isLoading || !form) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando configurações de pagamento...</CardContent></Card>;
  if (query.isError) return <Card><CardContent className="p-6 text-sm text-destructive">Não foi possível carregar as configurações de pagamento.</CardContent></Card>;
  const alterar = <K extends keyof ConfiguracaoPagamentoPayload>(campo: K, valor: ConfiguracaoPagamentoPayload[K]) => setForm((atual) => atual ? { ...atual, [campo]: valor } : atual);
  function salvar(e: FormEvent) { e.preventDefault(); mutation.mutate(form!); }
  return <Card><CardHeader className="flex-row items-center justify-between gap-4"><div><CardTitle>Pagamento</CardTitle><p className="mt-1 text-sm text-muted-foreground">Configure o Mercado Pago e as regras de cobrança dos tickets.</p></div><Badge variant={tokenConfigurado ? "success" : "warning"}>{tokenConfigurado ? "Token configurado" : "Token pendente"}</Badge></CardHeader><CardContent>
    <form onSubmit={salvar} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label={tokenConfigurado ? "Novo access token (opcional)" : "Access token"}><Input type="password" autoComplete="new-password" maxLength={2000} value={form.mercadoPagoToken ?? ""} placeholder={tokenConfigurado ? "Deixe vazio para manter o atual" : "APP_USR-..."} onChange={(e) => alterar("mercadoPagoToken", e.target.value)} required={!tokenConfigurado} /></Campo>
        <Campo label="Chave pública"><Input maxLength={255} value={form.mercadoPagoChavePublica ?? ""} placeholder="APP_USR-..." onChange={(e) => alterar("mercadoPagoChavePublica", e.target.value)} /></Campo>
        <Campo label="Expiração do link (minutos)"><Input type="number" min={5} max={10080} value={form.expiracaoLinkMinutos} onChange={(e) => alterar("expiracaoLinkMinutos", Number(e.target.value))} required /></Campo>
      </div>
      <div className="grid gap-3">
        <Opcao label="Cobrar automaticamente ao finalizar o ticket" descricao="tickets cobrados e não pagas seguem para aguardando pagamento antes da finalização." checked={form.cobrarAutomaticamenteOsFinalizada} onChange={(v) => alterar("cobrarAutomaticamenteOsFinalizada", v)} />
        <Opcao label="Permitir ticket sem cobrança" descricao="Permite desmarcar a cobrança durante a análise administrativa." checked={form.permitirOsSemCobranca} onChange={(v) => alterar("permitirOsSemCobranca", v)} />
      </div>
      <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configurações de pagamento</Button>
    </form>
  </CardContent></Card>;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function Opcao({ label, descricao, checked, onChange }: { label: string; descricao: string; checked: boolean; onChange: (v: boolean) => void }) { return <label className="flex items-center justify-between gap-4 rounded-md border p-4"><span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{descricao}</span></span><Input aria-label={label} className="h-4 w-4" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>; }

