import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
  senha: z.string().min(1, "Informe a senha")
});

export const cadastroInicialSchema = z
  .object({
    nome: z.string().min(3, "Informe um nome com pelo menos 3 caracteres"),
    email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme a senha")
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas devem ser iguais",
    path: ["confirmarSenha"]
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type CadastroInicialFormData = z.infer<typeof cadastroInicialSchema>;
