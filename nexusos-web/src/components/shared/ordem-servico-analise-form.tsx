"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ordemServicoAnaliseSchema, type OrdemServicoAnaliseFormData } from "@/schemas/ordem-servico-analise-schema";
import type { OrdemServico } from "@/types";

type OrdemServicoAnaliseFormProps = {
  ordem: OrdemServico;
  valorHora: number;
  isSubmitting?: boolean;
  readOnly?: boolean;
  onSubmit: (data: OrdemServicoAnaliseFormData) => void;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function OrdemServicoAnaliseForm({
  ordem,
  valorHora,
  isSubmitting = false,
  readOnly = false,
  onSubmit
}: OrdemServicoAnaliseFormProps) {
  const form = useForm<OrdemServicoAnaliseFormData>({
    resolver: zodResolver(ordemServicoAnaliseSchema),
    defaultValues: {
      textoAnalise: "",
      estimativaHoras: 0,
      cobrar: true
    }
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="estimativaHoras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas estimadas</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.25" placeholder="0" disabled={readOnly} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="rounded-md border bg-secondary/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calculator className="h-4 w-4" />
              Valor previsto
            </div>
            <div className="mt-1 text-2xl font-semibold">{moeda.format(valorTotal)}</div>
            <div className="text-xs text-muted-foreground">
              {cobrar ? `Base: ${moeda.format(valorHora)} por hora` : "Esta OS nao sera cobrada"}
            </div>
          </div>
          <FormField
            control={form.control}
            name="cobrar"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <label className="flex items-start gap-3 rounded-md border bg-secondary/30 p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={field.value}
                    disabled={readOnly}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium">Cobrar esta OS</span>
                    <span className="block text-sm text-muted-foreground">
                      Desmarque quando a ordem de servico nao deve gerar valor para o cliente.
                    </span>
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="textoAnalise"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Texto da Analise</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-40"
                    placeholder="Descreva a analise tecnica da OS"
                    disabled={readOnly}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {!readOnly ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4" />
              Salvar analise
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
