"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { clienteSchema, type ClienteFormData } from "@/schemas/cliente-schema";
import type { Cliente } from "@/types";

type ClienteFormProps = {
  cliente?: Cliente | null;
  isSubmitting?: boolean;
  onSubmit: (data: ClienteFormData) => void;
};

export function ClienteForm({ cliente, isSubmitting = false, onSubmit }: ClienteFormProps) {
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: "",
      documento: "",
      email: "",
      telefone: "",
      valorHora: 0
    }
  });

  useEffect(() => {
    form.reset({
      nome: cliente?.nome ?? "",
      documento: cliente?.documento ?? "",
      email: cliente?.email ?? "",
      telefone: cliente?.telefone ?? "",
      valorHora: cliente?.valorHora ?? 0
    });
  }, [cliente, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="documento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Documento</FormLabel>
                <FormControl>
                  <Input placeholder="CNPJ ou CPF" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contato@cliente.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valorHora"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da hora</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            Salvar cliente
          </Button>
        </div>
      </form>
    </Form>
  );
}
