export type PerfilUsuario = "ADMIN" | "DESENVOLVEDOR" | "ANALISTA" | "CLIENTE";

export type StatusOS =
  | "RECEBIDA"
  | "EM_ANALISE"
  | "APROVADA"
  | "EM_DESENVOLVIMENTO"
  | "EM_TESTES"
  | "AGUARDANDO_VALIDACAO"
  | "FINALIZADA"
  | "CANCELADA";

export type PrioridadeOS = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string;
};

export type Cliente = {
  id: string;
  nome: string;
  documento: string;
  email: string;
  telefone?: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type OrdemServico = {
  id: string;
  titulo: string;
  descricao: string;
  clienteId: string;
  clienteNome: string;
  responsavelId?: string;
  responsavelNome?: string;
  status: StatusOS;
  prioridade: PrioridadeOS;
  prazo?: string;
  estimativaHoras?: number;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
};

export type { AuthResponse, CadastroInicialRequest, LoginRequest } from "@/types/auth";
