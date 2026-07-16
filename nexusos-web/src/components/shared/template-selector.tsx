"use client";

import { BookTemplate, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { carregarTemplatesPersonalizados, salvarTemplatesPersonalizados, templatesIniciais, type TemplateTexto, type TipoTemplate } from "@/lib/templates";

type Props = { tipo: TipoTemplate; onApply: (conteudo: string) => void; disabled?: boolean };

export function TemplateSelector({ tipo, onApply, disabled = false }: Props) {
  const [personalizados, setPersonalizados] = useState<TemplateTexto[]>([]);
  const [selecionado, setSelecionado] = useState("");
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");
  useEffect(() => setPersonalizados(carregarTemplatesPersonalizados()), []);
  const templates = useMemo(() => [...templatesIniciais, ...personalizados].filter((item) => item.tipo === tipo), [personalizados, tipo]);

  function aplicar() {
    const template = templates.find((item) => item.id === selecionado);
    if (!template) return;
    onApply(template.conteudo);
    toast.success(`Template "${template.nome}" aplicado.`);
  }

  function criar() {
    const nomeLimpo = nome.trim();
    const conteudoLimpo = conteudo.trim();
    if (!nomeLimpo || !conteudoLimpo) return void toast.error("Informe o nome e o conteudo do template.");
    if (nomeLimpo.length > 80 || conteudoLimpo.length > 5000) return void toast.error("Use ate 80 caracteres no nome e 5.000 no conteudo.");
    const novo: TemplateTexto = { id: `personalizado-${Date.now()}-${Math.random().toString(36).slice(2)}`, nome: nomeLimpo, conteudo: conteudoLimpo, tipo, personalizado: true };
    const atualizados = [...personalizados, novo];
    setPersonalizados(atualizados);
    salvarTemplatesPersonalizados(atualizados);
    setSelecionado(novo.id);
    setNome(""); setConteudo(""); setAberto(false);
    toast.success("Template salvo.");
  }

  function excluir() {
    if (!personalizados.some((item) => item.id === selecionado)) return;
    const atualizados = personalizados.filter((item) => item.id !== selecionado);
    setPersonalizados(atualizados);
    salvarTemplatesPersonalizados(atualizados);
    setSelecionado("");
    toast.success("Template excluido.");
  }

  return <div className="flex flex-wrap items-center gap-2 rounded-md border bg-secondary/20 p-2">
    <BookTemplate className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    <Select value={selecionado} onValueChange={setSelecionado} disabled={disabled}>
      <SelectTrigger className="min-w-52 flex-1"><SelectValue placeholder="Escolha um template" /></SelectTrigger>
      <SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.nome}</SelectItem>)}</SelectContent>
    </Select>
    <Button type="button" variant="outline" size="sm" onClick={aplicar} disabled={disabled || !selecionado}>Aplicar</Button>
    {personalizados.some((item) => item.id === selecionado) ? <Button type="button" variant="ghost" size="icon" onClick={excluir} disabled={disabled} aria-label="Excluir template personalizado"><Trash2 className="h-4 w-4" /></Button> : null}
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button type="button" variant="ghost" size="sm" disabled={disabled}><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input value={nome} onChange={(event) => setNome(event.target.value)} maxLength={80} placeholder="Nome do template" />
          <Textarea value={conteudo} onChange={(event) => setConteudo(event.target.value)} maxLength={5000} className="min-h-48" placeholder="Conteudo reutilizavel" />
          <div className="flex justify-end"><Button type="button" onClick={criar}>Salvar template</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
