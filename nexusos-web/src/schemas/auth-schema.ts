import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
  senha: z.string().min(1, "Informe a senha")
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido")
});

export const resetPasswordSchema = z.object({
  novaSenha: z.string().min(8, "Use ao menos 8 caracteres")
    .regex(/[a-z]/, "Inclua uma letra minuscula")
    .regex(/[A-Z]/, "Inclua uma letra maiuscula")
    .regex(/\d/, "Inclua um numero"),
  confirmarSenha: z.string().min(1, "Confirme a nova senha")
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas nao coincidem",
  path: ["confirmarSenha"]
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
