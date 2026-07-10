import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
  senha: z.string().min(1, "Informe a senha")
});

export type LoginFormData = z.infer<typeof loginSchema>;
