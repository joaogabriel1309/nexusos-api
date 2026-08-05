"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Info, Save, Send } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/shared/template-selector";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ordemServicoAnaliseConclusaoSchema,
  ordemServicoAnaliseSchema,
  type OrdemServicoAnaliseFormData
} from "@/schemas/ordem-servico-analise-schema";
import { combinarComTextoAtual } from "@/lib/templates";
import type { OrdemServico } from "@/types";

type OrdemServicoAnaliseFormProps = {
  ordem: OrdemServico;
  valorHora: number;
  isSubmitting?: boolean;
  readOnly?: boolean;
  developerMode?: boolean;
  onSubmit: (data: OrdemServicoAnaliseFormData) => void;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function OrdemServicoAnaliseForm({
  ordem,
  valorHora,
  isSubmitting = false,
  readOnly = false,
  developerMode = false,
  onSubmit
}: OrdemServicoAnaliseFormProps) {
  const form = useForm<OrdemServicoAnaliseFormData>({
    resolver: zodResolver(developerMode ? ordemServicoAnaliseSchema : ordemServicoAnaliseConclusaoSchema),
    defaultValues: { textoAnalise: "", estimativaHoras: 0, cobrar: true }
  });
  const estimativaHoras = form.watch("estimativaHoras") || 0;
  const cobrar = form.watch("cobrar");
  const valorTotal = cobrar ? estimativaHoras * valorHora : 0;

  useEffect(() => {
    form.reset({
      textoAnalise: ordem.entendimento ?? "",
      estimativaHoras: ordem.estimativaHoras ?? 0,
      cobrar: ordem.cobrar ?? true
    });
  }, [form, ordem]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-md border bg-secondary/30 p-4" aria-labelledby="solicitacao-ticket">
          <div id="solicitacao-ticket" className="text-xs font-semibold uppercase text-muted-foreground">Solicitação</div>
          <h2 className="mt-2 break-words text-base font-semibold [overflow-wrap:anywhere]">{ordem.codigo} - {ordem.titulo}</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{ordem.descricao}</p>
        </section>

        <div className="flex gap-3 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            {developerMode
              ? "Informe apenas a estimativa de horas. A análise comercial e o envio ao cliente ficam sob responsabilidade do administrador."
              : "Descreva a solução proposta e estime o esforço. Ao concluir, o ticket será enviado automaticamente para aprovação do cliente."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {!developerMode ? (
            <FormField
              control={form.control}
              name="textoAnalise"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <FormLabel>Análise e solução proposta</FormLabel>
                    <TemplateSelector
                      tipo="ANALISE_TECNICA"
                      disabled={readOnly}
                      onApply={(conteudo) => form.setValue("textoAnalise", combinarComTextoAtual(field.value ?? "", conteudo), { shouldDirty: true, shouldValidate: true })}
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      className="min-h-44"
                      placeholder="Explique o entendimento da solicitação, a solução indicada e o resultado esperado"
                      disabled={readOnly}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="estimativaHoras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas estimadas</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.25" inputMode="decimal" placeholder="Ex.: 2,5" disabled={readOnly} {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Use intervalos de 15 minutos, como 1,25 ou 2,5.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          {!developerMode ? (
            <div className="rounded-md border bg-secondary/30 px-4 py-3" aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-medium"><Calculator className="h-4 w-4" />Valor previsto</div>
              <div className="mt-1 text-2xl font-semibold">{moeda.format(valorTotal)}</div>
              <div className="text-xs text-muted-foreground">{cobrar ? `${moeda.format(valorHora)} por hora` : "Este ticket não será cobrado"}</div>
            </div>
          ) : null}

          {!developerMode ? (
            <FormField
              control={form.control}
              name="cobrar"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <label className="flex min-h-14 items-start gap-3 rounded-md border bg-secondary/30 p-4">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                      checked={field.value}
                      disabled={readOnly}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    <span><span className="block text-sm font-medium">Gerar cobrança para este ticket</span><span className="block text-sm text-muted-foreground">Desmarque somente quando o atendimento não deve gerar valor para o cliente.</span></span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>

        {!readOnly ? (
          <div className="sticky bottom-20 z-20 -mx-4 flex border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:justify-end sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {developerMode ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {developerMode ? "Salvar estimativa" : "Concluir e enviar para aprovação"}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
