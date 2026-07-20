"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, RefreshCcw, Save, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { configuracaoEmpresaQueryKey } from "@/components/layout/company-theme";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { aplicarCorPrincipal } from "@/lib/cor-principal";
import { configuracaoEmpresaService } from "@/services/configuracao-empresa-service";
import type { ConfiguracaoEmpresaPayload } from "@/types/configuracao-empresa";
import { EmailSettingsCard } from "./email-settings-card";

const vazio: ConfiguracaoEmpresaPayload = { nome: "", logo: null, documento: null, email: null, telefone: null, endereco: null, corPrincipal: "#087EA4" };

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfiguracaoEmpresaPayload>(vazio);
  const query = useQuery({ queryKey: configuracaoEmpresaQueryKey, queryFn: configuracaoEmpresaService.buscar });
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);
  const mutation = useMutation({
    mutationFn: configuracaoEmpresaService.atualizar,
    onSuccess: (data) => {
      queryClient.setQueryData(configuracaoEmpresaQueryKey, data);
      setForm(data);
      aplicarCorPrincipal(data.corPrincipal);
      toast.success("Configurações da empresa salvas com sucesso.");
    },
    onError: () => toast.error("Não foi possível salvar as configurações.")
  });
  function alterar(campo: keyof ConfiguracaoEmpresaPayload, valor: string | null) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }
  function selecionarLogo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      toast.error("Use uma imagem PNG, JPEG ou WebP de até 2 MB.");
      event.target.value = "";
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => alterar("logo", String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }
  function salvar(event: FormEvent) {
    event.preventDefault();
    const digitos = form.documento?.replace(/\D/g, "") ?? "";
    if (!form.nome.trim() || !/^#[0-9a-f]{6}$/i.test(form.corPrincipal)) {
      toast.error("Informe o nome da empresa e uma cor válida.");
      return;
    }
    if (digitos && ![11, 14].includes(digitos.length)) {
      toast.error("CNPJ/CPF deve conter 11 ou 14 dígitos.");
      return;
    }
    mutation.mutate(form);
  }
  return (
    <AppShell><div className="space-y-6">
      <PageHeader title="Configurações da empresa" description="Personalize os dados de contato e a identidade visual do sistema." />
      {query.isLoading ? <Skeleton className="h-[520px] w-full" /> : query.isError ? (
        <Card><CardContent className="flex items-center justify-between gap-4 p-6"><span className="text-sm text-muted-foreground">Não foi possível carregar as configurações.</span><Button variant="outline" onClick={() => query.refetch()}><RefreshCcw className="h-4 w-4" />Tentar novamente</Button></CardContent></Card>
      ) : (
        <form onSubmit={salvar} className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card><CardHeader><CardTitle>Dados da empresa</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
            <Campo label="Nome da empresa" required><Input value={form.nome} maxLength={160} onChange={(e) => alterar("nome", e.target.value)} required /></Campo>
            <Campo label="CNPJ/CPF"><Input value={form.documento ?? ""} maxLength={18} onChange={(e) => alterar("documento", e.target.value)} placeholder="Somente números ou com máscara" /></Campo>
            <Campo label="E-mail de contato"><Input type="email" value={form.email ?? ""} maxLength={160} onChange={(e) => alterar("email", e.target.value)} /></Campo>
            <Campo label="Telefone/WhatsApp"><Input value={form.telefone ?? ""} maxLength={32} onChange={(e) => alterar("telefone", e.target.value)} /></Campo>
            <Campo label="Endereço" className="sm:col-span-2"><Input value={form.endereco ?? ""} maxLength={300} onChange={(e) => alterar("endereco", e.target.value)} /></Campo>
          </CardContent></Card>
          <div className="space-y-6"><Card><CardHeader><CardTitle>Identidade visual</CardTitle></CardHeader><CardContent className="space-y-5">
            <div className="space-y-2"><label className="text-sm font-medium" htmlFor="logo">Logo</label>{form.logo ? <div className="relative h-24 w-full rounded-md border"><Image src={form.logo} alt="Prévia da logo da empresa" fill unoptimized className="object-contain p-2" /></div> : <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-muted-foreground"><ImagePlus className="h-7 w-7" /></div>}<Input id="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionarLogo} /><p className="text-xs text-muted-foreground">PNG, JPEG ou WebP, até 2 MB.</p>{form.logo ? <Button type="button" variant="outline" size="sm" onClick={() => alterar("logo", null)}><Trash2 className="h-4 w-4" />Remover logo</Button> : null}</div>
            <Campo label="Cor principal" required><div className="flex gap-2"><Input type="color" className="w-14 p-1" value={form.corPrincipal} onChange={(e) => alterar("corPrincipal", e.target.value.toUpperCase())} aria-label="Selecionar cor principal" /><Input value={form.corPrincipal} maxLength={7} pattern="#[0-9A-Fa-f]{6}" onChange={(e) => alterar("corPrincipal", e.target.value)} required /></div></Campo>
          </CardContent></Card><Button className="w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configurações</Button></div>
        </form>
      )}
      <EmailSettingsCard />
    </div></AppShell>
  );
}

function Campo({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <label className={`space-y-2 ${className ?? ""}`}><span className="text-sm font-medium">{label}{required ? " *" : ""}</span>{children}</label>;
}
