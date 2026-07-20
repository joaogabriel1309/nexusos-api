"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/schemas/auth-schema";
import { authService } from "@/services/auth-service";

function RedefinirSenhaForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const form = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { novaSenha: "", confirmarSenha: "" } });
  async function onSubmit(values: ResetPasswordFormData) {
    if (!token) { toast.error("Link de recuperacao invalido."); return; }
    try {
      await authService.resetPassword(token, values.novaSenha);
      toast.success("Senha redefinida. Entre com sua nova senha.");
      router.push("/login");
    } catch { toast.error("O link e invalido ou expirou. Solicite um novo."); }
  }
  return <Card className="w-full max-w-md"><CardHeader><CardTitle>Definir nova senha</CardTitle><CardDescription>Use pelo menos 8 caracteres, com maiuscula, minuscula e numero.</CardDescription></CardHeader><CardContent>
    {!token ? <div className="space-y-4"><p className="text-sm text-destructive">Link de recuperacao invalido.</p><Button asChild className="w-full"><Link href="/esqueci-senha">Solicitar novo link</Link></Button></div> :
    <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField control={form.control} name="novaSenha" render={({ field }) => <FormItem>
        <FormLabel htmlFor="novaSenha">Nova senha</FormLabel>
        <FormControl><Input id="novaSenha" aria-label="Nova senha" type="password" autoComplete="new-password" {...field} /></FormControl>
        <FormMessage />
      </FormItem>} />
      <FormField control={form.control} name="confirmarSenha" render={({ field }) => <FormItem>
        <FormLabel htmlFor="confirmarSenha">Confirmar senha</FormLabel>
        <FormControl><Input id="confirmarSenha" aria-label="Confirmar nova senha" type="password" autoComplete="new-password" {...field} /></FormControl>
        <FormMessage />
      </FormItem>} />
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Redefinir senha</Button>
    </form></Form>}
  </CardContent></Card>;
}

export default function RedefinirSenhaPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10"><Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}><RedefinirSenhaForm /></Suspense></main>;
}
