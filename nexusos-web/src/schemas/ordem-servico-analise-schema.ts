import { z } from "zod";

export const ordemServicoAnaliseSchema = z.object({
  textoAnalise: z.string().optional(),
  estimativaHoras: z.coerce.number().min(0, "Informe a quantidade de horas prevista"),
  cobrar: z.boolean()
});

export type OrdemServicoAnaliseFormData = z.infer<typeof ordemServicoAnaliseSchema>;
