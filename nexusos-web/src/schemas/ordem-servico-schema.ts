import { z } from "zod";

export const ordemServicoSchema = z.object({
  titulo: z.string().min(3, "Informe um título com pelo menos 3 caracteres"),
  descricao: z.string().min(10, "Descreva a demanda com pelo menos 10 caracteres"),
  clienteId: z.string().min(1, "Selecione um cliente"),
  responsavelId: z.string().optional(),
  projetoId: z.string().optional(),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"], {
    required_error: "Selecione a prioridade"
  }),
  prazo: z.string().optional(),
  prazoIndefinido: z.boolean()
});

export type OrdemServicoFormData = z.infer<typeof ordemServicoSchema>;
