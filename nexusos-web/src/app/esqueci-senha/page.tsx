"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/schemas/auth-schema";
import { authService } from "@/services/auth-service";

export default function EsqueciSenhaPage() {
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  async function onSubmit(values: ForgotPasswordFormData) {
    try {
      await authService.forgotPassword(values.email);
      toast.success("Se o e-mail estiver cadastrado, voce recebera as instrucoes em instantes.");
      form.reset();
    } catch {
      toast.error("Nao foi possivel processar a solicitacao. Tente novamente.");
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Recuperar senha</CardTitle><CardDescription>Informe seu e-mail para receber o link de recuperacao.</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => <FormItem>
            <FormLabel>E-mail</FormLabel><FormControl><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" className="pl-9" autoComplete="email" {...field} /></div></FormControl><FormMessage />
          </FormItem>} />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Enviar link</Button>
          <Button variant="ghost" className="w-full" asChild><Link href="/login">Voltar ao login</Link></Button>
        </form></Form>
      </CardContent>
    </Card>
  </main>;
}
