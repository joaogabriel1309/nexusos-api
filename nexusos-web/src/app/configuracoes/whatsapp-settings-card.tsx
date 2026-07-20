"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { configuracaoWhatsappService } from "@/services/configuracao-whatsapp-service";
import type { ConfiguracaoWhatsappPayload } from "@/types/configuracao-whatsapp";

const queryKey = ["configuracao-whatsapp"] as const;
const vazio: ConfiguracaoWhatsappPayload = { habilitado: false, provedor: "CALLMEBOT", credencial: null, numeroPadrao: null, metaPhoneNumberId: null };

export function WhatsappSettingsCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfiguracaoWhatsappPayload>(vazio);
  const [credencialConfigurada, setCredencialConfigurada] = useState(false);
  const query = useQuery({ queryKey, queryFn: configuracaoWhatsappService.buscar });

  useEffect(() => {
    if (!query.data) return;
    setForm({ habilitado: query.data.habilitado, provedor: query.data.provedor, credencial: null,
      numeroPadrao: query.data.numeroPadrao, metaPhoneNumberId: query.data.metaPhoneNumberId });
    setCredencialConfigurada(query.data.credencialConfigurada);
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: configuracaoWhatsappService.atualizar,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setCredencialConfigurada(data.credencialConfigurada);
      setForm((atual) => ({ ...atual, credencial: null }));
      toast.success("Configuração de WhatsApp salva com sucesso.");
    },
    onError: () => toast.error("Não foi possível salvar. Verifique os campos da integração.")
  });
  const testar = useMutation({
    mutationFn: configuracaoWhatsappService.testar,
    onSuccess: () => toast.success("Mensagem de teste enviada com sucesso."),
    onError: () => toast.error("Falha no envio. Verifique o provedor e a credencial.")
  });

  function alterar<K extends keyof ConfiguracaoWhatsappPayload>(campo: K, valor: ConfiguracaoWhatsappPayload[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }
  function submeter(event: FormEvent) {
    event.preventDefault();
    salvar.mutate(form);
  }

  if (query.isLoading) return <Skeleton className="h-[420px] w-full" />;
  if (query.isError) return <Card><CardContent className="flex items-center justify-between gap-4 p-6"><span className="text-sm text-muted-foreground">Não foi possível carregar a configuração de WhatsApp.</span><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></CardContent></Card>;

  return <Card>
    <CardHeader className="flex-row items-center justify-between gap-4">
      <div className="space-y-1"><CardTitle>Envio por WhatsApp</CardTitle><p className="text-sm text-muted-foreground">Configure o provedor usado nas notificações aos clientes.</p></div>
      <Badge variant={query.data?.configurado ? "success" : "warning"}>{query.data?.configurado ? "Configurado" : "Não configurado"}</Badge>
    </CardHeader>
    <CardContent className="space-y-6">
      <form onSubmit={submeter} className="space-y-5">
        <label className="flex items-center justify-between gap-4 rounded-md border p-4">
          <span><span className="block text-sm font-medium">Ativar envio por WhatsApp</span><span className="text-xs text-muted-foreground">Quando desativado, os envios automáticos ficam suspensos.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={form.habilitado} onChange={(e) => alterar("habilitado", e.target.checked)} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="Provedor" required><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.provedor} onChange={(e) => alterar("provedor", e.target.value as ConfiguracaoWhatsappPayload["provedor"])}><option value="CALLMEBOT">CallMeBot</option><option value="META">Meta WhatsApp API</option></select></Campo>
          <Campo label="Número padrão" required><Input type="tel" value={form.numeroPadrao ?? ""} maxLength={32} placeholder="+55 11 99999-9999" onChange={(e) => alterar("numeroPadrao", e.target.value)} required={form.habilitado} /></Campo>
          <Campo label={credencialConfigurada ? "Nova chave/token (opcional)" : "Chave/token"} required={!credencialConfigurada && form.habilitado}><Input type="password" value={form.credencial ?? ""} maxLength={1000} autoComplete="new-password" placeholder={credencialConfigurada ? "Deixe vazio para manter a atual" : "Credencial fornecida pelo provedor"} onChange={(e) => alterar("credencial", e.target.value)} required={!credencialConfigurada && form.habilitado} /></Campo>
          {form.provedor === "META" ? <Campo label="ID do número na Meta" required><Input inputMode="numeric" pattern="[0-9]+" value={form.metaPhoneNumberId ?? ""} maxLength={100} onChange={(e) => alterar("metaPhoneNumberId", e.target.value)} required={form.habilitado} /></Campo> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configuração de WhatsApp</Button>
          <Button type="button" variant="outline" disabled={!query.data?.configurado || testar.isPending} onClick={() => testar.mutate()}>{testar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Enviar teste</Button>
        </div>
        {!query.data?.configurado ? <p className="text-xs text-muted-foreground">Salve os campos obrigatórios antes de enviar um teste.</p> : null}
      </form>
    </CardContent>
  </Card>;
}

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="text-sm font-medium">{label}{required ? " *" : ""}</span>{children}</label>;
}
