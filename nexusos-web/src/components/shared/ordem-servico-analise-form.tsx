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
      entendimento: "",
      impacto: "",
      riscos: "",
      estimativaHoras: 0
    }
  });
  const estimativaHoras = form.watch("estimativaHoras") || 0;
  const valorTotal = estimativaHoras * valorHora;

  useEffect(() => {
    form.reset({
      entendimento: ordem.entendimento ?? "",
      impacto: ordem.impacto ?? "",
      riscos: ordem.riscos ?? "",
      estimativaHoras: ordem.estimativaHoras ?? 0
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
            <div className="text-xs text-muted-foreground">Base: {moeda.format(valorHora)} por hora</div>
          </div>
          <FormField
            control={form.control}
            name="entendimento"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Entendimento</FormLabel>
                <FormControl>
                  <Textarea placeholder="Resumo do entendimento tecnico" disabled={readOnly} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="impacto"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Impacto</FormLabel>
                <FormControl>
                  <Textarea placeholder="Impactos esperados para negocio, sistema ou operacao" disabled={readOnly} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="riscos"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Riscos</FormLabel>
                <FormControl>
                  <Textarea placeholder="Riscos, dependencias e pontos de atencao" disabled={readOnly} {...field} />
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
