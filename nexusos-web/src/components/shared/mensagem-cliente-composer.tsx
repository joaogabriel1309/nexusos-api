"use client";

import { Clipboard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TemplateSelector } from "@/components/shared/template-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { combinarComTextoAtual } from "@/lib/templates";

export function MensagemClienteComposer() {
  const [mensagem, setMensagem] = useState("");

  async function copiar() {
    if (!mensagem.trim()) return void toast.error("Escreva ou aplique um template antes de copiar.");
    try {
      await navigator.clipboard.writeText(mensagem.trim());
      toast.success("Mensagem copiada para envio ao cliente.");
    } catch {
      toast.error("Nao foi possivel copiar a mensagem.");
    }
  }

  return <div className="space-y-3">
    <TemplateSelector tipo="MENSAGEM_CLIENTE" onApply={(conteudo) => setMensagem((atual) => combinarComTextoAtual(atual, conteudo))} />
    <Textarea value={mensagem} onChange={(event) => setMensagem(event.target.value)} className="min-h-28" placeholder="Prepare uma mensagem para enviar pelo canal de atendimento." />
    <div className="flex justify-end"><Button type="button" variant="outline" onClick={copiar}><Clipboard className="h-4 w-4" /> Copiar mensagem</Button></div>
  </div>;
}
