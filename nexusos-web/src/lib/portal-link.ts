import { isAxiosError } from "axios";

export const mensagemLinkPortalInvalido =
  "Este link expirou ou não é mais válido. Peça um novo link à equipe.";

// A API responde 404 quando o token do portal não existe, expirou ou o cliente está inativo.
export function linkPortalInvalido(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404;
}

// Link inválido não melhora com novas tentativas; os demais erros mantêm o padrão de 3 tentativas.
export function repetirConsultaPortal(falhas: number, error: unknown) {
  return !linkPortalInvalido(error) && falhas < 3;
}

export function tokenAcessoExpirado(expiraEm?: string | null) {
  return !expiraEm || new Date(expiraEm).getTime() <= Date.now();
}
