"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { perfisUsuario, usuarioSchema, type UsuarioFormData } from "@/schemas/usuario-schema";
import type { Usuario } from "@/types";

type UsuarioFormProps = {
  usuario?: Usuario | null;
  isSubmitting?: boolean;
  onSubmit: (data: UsuarioFormData) => void;
};

const perfilLabels = {
  ADMIN: "Administrador",
  DESENVOLVEDOR: "Desenvolvedor"
};

export function UsuarioForm({ usuario, isSubmitting = false, onSubmit }: UsuarioFormProps) {
  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      perfil: "DESENVOLVEDOR"
    }
  });

  useEffect(() => {
    form.reset({
      nome: usuario?.nome ?? "",
      email: usuario?.email ?? "",
      senha: "",
      perfil: usuario?.perfil ?? "DESENVOLVEDOR"
    });
  }, [usuario, form]);

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
                  <Input placeholder="Nome do usuário" {...field} />
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
                  <Input type="email" placeholder="usuario@nexusos.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="perfil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Perfil</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {perfisUsuario.map((perfil) => (
                      <SelectItem key={perfil} value={perfil}>
                        {perfilLabels[perfil]}
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
            name="senha"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{usuario ? "Nova senha" : "Senha"}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={usuario ? "Preencha apenas se quiser alterar" : "Mínimo de 6 caracteres"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            Salvar usuário
          </Button>
        </div>
      </form>
    </Form>
  );
}
