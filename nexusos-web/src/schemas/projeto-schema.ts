import { z } from "zod";

export const projetoSchema = z.object({
  nome: z.string().min(3, "Informe um nome com pelo menos 3 caracteres").max(160, "Informe no maximo 160 caracteres"),
  descricao: z.string().optional()
});

export type ProjetoFormData = z.infer<typeof projetoSchema>;
