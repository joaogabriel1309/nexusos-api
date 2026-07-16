import { z } from "zod";
import type { PerfilUsuario } from "@/types";

export const perfisUsuario = ["ADMIN", "DESENVOLVEDOR"] as [PerfilUsuario, ...PerfilUsuario[]];

const senhaSchema = z
  .string()
  .optional()
  .refine((value) => !value || value.length >= 6, "A senha deve ter pelo menos 6 caracteres");

export const usuarioSchema = z.object({
  nome: z.string().min(3, "Informe um nome com pelo menos 3 caracteres").max(120, "Informe no maximo 120 caracteres"),
  email: z.string().min(1, "Informe o e-mail").email("Informe um e-mail valido"),
  senha: senhaSchema,
  perfil: z.enum(perfisUsuario, {
    message: "Informe o perfil do usuário"
  })
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;

export function validarUsuarioForm(data: UsuarioFormData, isEditing: boolean) {
  const parsed = usuarioSchema.parse(data);

  if (!isEditing && !parsed.senha) {
    throw new Error("Informe a senha do usuário");
  }

  return parsed;
}
