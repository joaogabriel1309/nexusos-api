export type PerfilUsuario = "ADMIN" | "DESENVOLVEDOR" | "ANALISTA" | "CLIENTE";

export type StatusOS =
  | "RECEBIDA"
  | "EM_ANALISE"
  | "AGUARDANDO_APROVACAO"
  | "APROVADA"
  | "EM_DESENVOLVIMENTO"
  | "EM_TESTE"
  | "AGUARDANDO_PAGAMENTO"
  | "FINALIZADA";

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
  valorHora: number;
  tokenAcesso?: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type Projeto = {
  id: string;
  nome: string;
  descricao?: string;
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
  projetoId?: string;
  projetoNome?: string;
  status: StatusOS;
  prioridade: PrioridadeOS;
  prazo?: string;
  entendimento?: string;
  impacto?: string;
  riscos?: string;
  estimativaHoras?: number;
  valorTotalEstimado?: number;
  cobrar?: boolean;
  descricaoFinalizacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
};

export type PortalOrdemServico = {
  id: string;
  titulo: string;
  descricao: string;
  status: StatusOS;
  criadoEm: string;
  atualizadoEm: string;
  aprovadaPeloCliente?: boolean;
  aprovadoPeloClienteEm?: string;
  observacaoAprovacaoCliente?: string;
};

export type PortalCliente = {
  clienteNome: string;
  ordens: PortalOrdemServico[];
};

export type { AuthResponse, CadastroInicialRequest, LoginRequest } from "@/types/auth";
