"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { projetoSchema, type ProjetoFormData } from "@/schemas/projeto-schema";
import type { Cliente, Projeto } from "@/types";

type ProjetoFormProps = {
  projeto?: Projeto | null;
  clientes: Pick<Cliente, "id" | "nome">[];
  isSubmitting?: boolean;
  onSubmit: (data: ProjetoFormData) => void;
};

export function ProjetoForm({ projeto, clientes, isSubmitting = false, onSubmit }: ProjetoFormProps) {
  const form = useForm<ProjetoFormData>({
    resolver: zodResolver(projetoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      clienteId: ""
    }
  });

  useEffect(() => {
    form.reset({
      nome: projeto?.nome ?? "",
      descricao: projeto?.descricao ?? "",
      clienteId: projeto?.clienteId ?? ""
    });
  }, [form, projeto]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do projeto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clienteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descricao</FormLabel>
              <FormControl>
                <Textarea placeholder="Resumo do escopo, objetivo ou contexto do projeto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            Salvar projeto
          </Button>
        </div>
      </form>
    </Form>
  );
}
