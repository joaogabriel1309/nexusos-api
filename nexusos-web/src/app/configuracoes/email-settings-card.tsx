"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MailCheck, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { configuracaoEmailService } from "@/services/configuracao-email-service";
import type { ConfiguracaoEmailPayload } from "@/types/configuracao-email";

const queryKey = ["configuracao-email"] as const;
const vazio: ConfiguracaoEmailPayload = { habilitado: false, smtpHost: null, smtpPort: 587, smtpUsuario: null, smtpSenha: null, emailRemetente: null };

export function EmailSettingsCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfiguracaoEmailPayload>(vazio);
  const [senhaConfigurada, setSenhaConfigurada] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const query = useQuery({ queryKey, queryFn: configuracaoEmailService.buscar });

  useEffect(() => {
    if (!query.data) return;
    setForm({ habilitado: query.data.habilitado, smtpHost: query.data.smtpHost, smtpPort: query.data.smtpPort ?? 587,
      smtpUsuario: query.data.smtpUsuario, smtpSenha: null, emailRemetente: query.data.emailRemetente });
    setSenhaConfigurada(query.data.senhaConfigurada);
    setDestinatario((atual) => atual || query.data.emailRemetente || "");
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: configuracaoEmailService.atualizar,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setSenhaConfigurada(data.senhaConfigurada);
      setForm((atual) => ({ ...atual, smtpSenha: null }));
      toast.success("Configuração de e-mail salva com sucesso.");
    },
    onError: () => toast.error("Não foi possível salvar. Verifique os campos SMTP.")
  });
  const testar = useMutation({
    mutationFn: configuracaoEmailService.testar,
    onSuccess: () => toast.success("E-mail de teste enviado com sucesso."),
    onError: () => toast.error("Falha no envio. Verifique a configuração SMTP.")
  });

  function alterar<K extends keyof ConfiguracaoEmailPayload>(campo: K, valor: ConfiguracaoEmailPayload[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }
  function submeter(event: FormEvent) {
    event.preventDefault();
    salvar.mutate(form);
  }

  if (query.isLoading) return <Skeleton className="h-[420px] w-full" />;
  if (query.isError) return <Card><CardContent className="flex items-center justify-between gap-4 p-6"><span className="text-sm text-muted-foreground">Não foi possível carregar a configuração de e-mail.</span><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></CardContent></Card>;

  return <Card>
    <CardHeader className="flex-row items-center justify-between gap-4">
      <div className="space-y-1"><CardTitle>Envio de e-mail</CardTitle><p className="text-sm text-muted-foreground">Configure o servidor SMTP usado pelo sistema.</p></div>
      <Badge variant={query.data?.configurado ? "success" : "warning"}>{query.data?.configurado ? "Configurado" : "Não configurado"}</Badge>
    </CardHeader>
    <CardContent className="space-y-6">
      <form onSubmit={submeter} className="space-y-5">
        <label className="flex items-center justify-between gap-4 rounded-md border p-4">
          <span><span className="block text-sm font-medium">Ativar envio de e-mails</span><span className="text-xs text-muted-foreground">Quando desativado, os envios automáticos ficam suspensos.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={form.habilitado} onChange={(e) => alterar("habilitado", e.target.checked)} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="SMTP host" required><Input value={form.smtpHost ?? ""} maxLength={255} placeholder="smtp.exemplo.com" onChange={(e) => alterar("smtpHost", e.target.value)} required={form.habilitado} /></Campo>
          <Campo label="Porta" required><Input type="number" min={1} max={65535} value={form.smtpPort ?? ""} onChange={(e) => alterar("smtpPort", e.target.value ? Number(e.target.value) : null)} required={form.habilitado} /></Campo>
          <Campo label="Usuário SMTP" required><Input value={form.smtpUsuario ?? ""} maxLength={255} autoComplete="username" onChange={(e) => alterar("smtpUsuario", e.target.value)} required={form.habilitado} /></Campo>
          <Campo label={senhaConfigurada ? "Nova senha (opcional)" : "Senha SMTP"} required={!senhaConfigurada && form.habilitado}><Input type="password" value={form.smtpSenha ?? ""} maxLength={500} autoComplete="new-password" placeholder={senhaConfigurada ? "Deixe vazio para manter a atual" : ""} onChange={(e) => alterar("smtpSenha", e.target.value)} required={!senhaConfigurada && form.habilitado} /></Campo>
          <Campo label="E-mail remetente" required className="sm:col-span-2"><Input type="email" value={form.emailRemetente ?? ""} maxLength={255} placeholder="noreply@exemplo.com" onChange={(e) => alterar("emailRemetente", e.target.value)} required={form.habilitado} /></Campo>
        </div>
        <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configuração de e-mail</Button>
      </form>
      <div className="border-t pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Campo label="Destinatário do teste" className="flex-1"><Input type="email" value={destinatario} maxLength={255} onChange={(e) => setDestinatario(e.target.value)} placeholder="voce@exemplo.com" /></Campo>
          <Button type="button" variant="outline" disabled={!query.data?.configurado || !destinatario || testar.isPending} onClick={() => testar.mutate(destinatario)}>{testar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}Enviar e-mail de teste</Button>
        </div>
        {!query.data?.configurado ? <p className="mt-2 text-xs text-muted-foreground">Salve todos os campos SMTP antes de testar.</p> : null}
      </div>
    </CardContent>
  </Card>;
}

function Campo({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <label className={`space-y-2 ${className ?? ""}`}><span className="text-sm font-medium">{label}{required ? " *" : ""}</span>{children}</label>;
}
