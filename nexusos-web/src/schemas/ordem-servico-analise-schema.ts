import { z } from "zod";

export const ordemServicoAnaliseSchema = z.object({
  textoAnalise: z.string().optional(),
  estimativaHoras: z.coerce.number().min(0, "Informe a quantidade de horas prevista"),
  cobrar: z.boolean()
});

export const ordemServicoAnaliseConclusaoSchema = ordemServicoAnaliseSchema.extend({
  textoAnalise: z.string().trim().min(1, "Descreva a análise e a solução proposta")
});

export type OrdemServicoAnaliseFormData = z.infer<typeof ordemServicoAnaliseSchema>;
