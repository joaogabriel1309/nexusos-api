"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ordemServicoSchema, type OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
import type { Cliente, OrdemServico, PrioridadeOS, Projeto, Usuario } from "@/types";

const responsavelNaoAtribuido = "__none__";
const projetoNaoVinculado = "__none__";

const prioridades: { value: PrioridadeOS; label: string }[] = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Critica" }
];

type OrdemServicoFormProps = {
  clientes: Pick<Cliente, "id" | "nome">[];
  responsaveis: Pick<Usuario, "id" | "nome">[];
  projetos: Pick<Projeto, "id" | "nome" | "clienteId">[];
  ordem?: OrdemServico | null;
  isSubmitting?: boolean;
  onSubmit: (data: OrdemServicoFormData) => void;
};

export function OrdemServicoForm({ clientes, responsaveis, projetos, ordem, isSubmitting = false, onSubmit }: OrdemServicoFormProps) {
  const form = useForm<OrdemServicoFormData>({
    resolver: zodResolver(ordemServicoSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      clienteId: "",
      responsavelId: "",
      projetoId: "",
      prioridade: "MEDIA",
      prazo: ""
    }
  });
  const clienteId = form.watch("clienteId");
  const projetosDoCliente = useMemo(() => {
    return projetos.filter((projeto) => !projeto.clienteId || projeto.clienteId === clienteId);
  }, [clienteId, projetos]);

  useEffect(() => {
    form.reset({
      titulo: ordem?.titulo ?? "",
      descricao: ordem?.descricao ?? "",
      clienteId: ordem?.clienteId ?? "",
      responsavelId: ordem?.responsavelId ?? "",
      projetoId: ordem?.projetoId ?? "",
      prioridade: ordem?.prioridade ?? "MEDIA",
      prazo: ordem?.prazo ?? ""
    });
  }, [form, ordem]);

  useEffect(() => {
    const projetoId = form.getValues("projetoId");
    if (projetoId && !projetosDoCliente.some((projeto) => projeto.id === projetoId)) {
      form.setValue("projetoId", "");
    }
  }, [form, projetosDoCliente]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Resumo objetivo da demanda" {...field} />
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
            name="responsavelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === responsavelNaoAtribuido ? "" : value)}
                  value={field.value || responsavelNaoAtribuido}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Atribuir depois" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={responsavelNaoAtribuido}>Atribuir depois</SelectItem>
                    {responsaveis.map((responsavel) => (
                      <SelectItem key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
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
            name="projetoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === projetoNaoVinculado ? "" : value)}
                  value={field.value || projetoNaoVinculado}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem projeto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={projetoNaoVinculado}>Sem projeto</SelectItem>
                    {projetosDoCliente.map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
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
            name="prioridade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {prioridades.map((prioridade) => (
                      <SelectItem key={prioridade.value} value={prioridade.value}>
                        {prioridade.label}
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
            name="prazo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Contexto, problema, expectativa e qualquer detalhe relevante" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            Salvar OS
          </Button>
        </div>
      </form>
    </Form>
  );
}
