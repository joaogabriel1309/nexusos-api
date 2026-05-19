import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().min(3, "Informe um nome com pelo menos 3 caracteres"),
  documento: z.string().min(3, "Informe o documento"),
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
  telefone: z.string().optional(),
  valorHora: z.coerce.number().min(0, "Informe um valor por hora valido")
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
