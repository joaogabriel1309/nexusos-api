"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { configuracaoOSService } from "@/services/configuracao-os-service";
import { usuarioService } from "@/services/usuario-service";
import type { ConfiguracaoOSPayload } from "@/types/configuracao-os";

export const configuracaoOSQueryKey = ["configuracoes", "os"] as const;
const semResponsavel = "__none__";

export function OSSettingsCard() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: configuracaoOSQueryKey, queryFn: configuracaoOSService.buscar });
  const usuarios = useQuery({ queryKey: ["usuarios"], queryFn: usuarioService.listar });
  const [form, setForm] = useState<ConfiguracaoOSPayload | null>(null);
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);
  const mutation = useMutation({
    mutationFn: configuracaoOSService.atualizar,
    onSuccess: (data) => { client.setQueryData(configuracaoOSQueryKey, data); setForm(data); toast.success("Configurações de OS salvas."); },
    onError: () => toast.error("Não foi possível salvar as configurações de OS.")
  });
  if (query.isLoading || !form) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando configurações de OS...</CardContent></Card>;
  if (query.isError) return <Card><CardContent className="p-6 text-sm text-destructive">Não foi possível carregar as configurações de OS.</CardContent></Card>;
  const alterar = <K extends keyof ConfiguracaoOSPayload>(campo: K, valor: ConfiguracaoOSPayload[K]) => setForm((atual) => atual ? { ...atual, [campo]: valor } : atual);
  function salvar(e: FormEvent) { e.preventDefault(); mutation.mutate(form!); }
  const ativos = (usuarios.data ?? []).filter((u) => u.ativo);
  return <Card><CardHeader><CardTitle>Ordens de serviço</CardTitle></CardHeader><CardContent>
    <form onSubmit={salvar} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["Baixa", "Média", "Alta", "Crítica"] as const).map((label, i) => { const campo = (["prazoBaixaDias", "prazoMediaDias", "prazoAltaDias", "prazoCriticaDias"] as const)[i]; return <label key={campo} className="space-y-2"><span className="text-sm font-medium">Prazo {label} (dias)</span><Input aria-label={`Prazo ${label} em dias`} type="number" min={0} max={3650} value={form[campo]} onChange={(e) => alterar(campo, Number(e.target.value))} required /></label>; })}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2"><span className="text-sm font-medium">Prioridade padrão</span><Select value={form.prioridadePadrao} onValueChange={(v) => alterar("prioridadePadrao", v as ConfiguracaoOSPayload["prioridadePadrao"])}><SelectTrigger aria-label="Prioridade padrão"><SelectValue /></SelectTrigger><SelectContent>{["BAIXA", "MEDIA", "ALTA", "CRITICA"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-2"><span className="text-sm font-medium">Responsável padrão</span><Select value={form.responsavelPadraoId ?? semResponsavel} onValueChange={(v) => alterar("responsavelPadraoId", v === semResponsavel ? null : v)}><SelectTrigger aria-label="Responsável padrão"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={semResponsavel}>Nenhum</SelectItem>{ativos.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-2"><span className="text-sm font-medium">Status inicial</span><Select value={form.statusInicial} onValueChange={(v) => alterar("statusInicial", v as ConfiguracaoOSPayload["statusInicial"])}><SelectTrigger aria-label="Status inicial"><SelectValue /></SelectTrigger><SelectContent>{["RECEBIDA", "EM_ANALISE", "AGUARDANDO_APROVACAO", "APROVADA", "EM_DESENVOLVIMENTO", "EM_TESTE", "AGUARDANDO_PAGAMENTO"].map((v) => <SelectItem key={v} value={v}>{v.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></label>
      </div>
      <div className="grid gap-3">
        <Opcao label="Permitir OS sem responsável" checked={form.permitirSemResponsavel} onChange={(v) => alterar("permitirSemResponsavel", v)} />
        <Opcao label="Exigir análise antes de enviar ao cliente" checked={form.exigirAnaliseAntesCliente} onChange={(v) => alterar("exigirAnaliseAntesCliente", v)} />
        <Opcao label="Exigir aprovação admin antes do cliente" checked={form.exigirAprovacaoAdminAntesCliente} onChange={(v) => alterar("exigirAprovacaoAdminAntesCliente", v)} />
      </div>
      <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configurações de OS</Button>
    </form>
  </CardContent></Card>;
}

function Opcao({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-3 text-sm"><Input aria-label={label} className="h-4 w-4" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}
