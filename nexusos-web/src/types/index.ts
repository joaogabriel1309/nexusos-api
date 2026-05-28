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
  enviarEmail: boolean;
  enviarWhatsapp: boolean;
  whatsappApiKey?: string;
  tokenAcesso?: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type Projeto = {
  id: string;
  nome: string;
  descricao?: string;
  clienteId?: string;
  clienteNome?: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type OrdemServico = {
  id: string;
  codigo: number;
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
  paga?: boolean;
  pagamentoIniciado?: boolean;
  descricaoFinalizacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
};

export type PortalOrdemServico = {
  id: string;
  codigo: number;
  titulo: string;
  descricao: string;
  status: StatusOS;
  prioridade: PrioridadeOS;
  prazo?: string;
  projetoId?: string;
  projetoNome?: string;
  textoAnalise?: string;
  estimativaHoras?: number;
  valorTotalEstimado?: number;
  cobrar?: boolean;
  paga?: boolean;
  pagamentoIniciado?: boolean;
  descricaoFinalizacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  aprovadaPeloCliente?: boolean;
  aprovadoPeloClienteEm?: string;
};

export type PortalCliente = {
  clienteNome: string;
  ordens: PortalOrdemServico[];
};

export type PagamentoCheckoutResponse = {
  preferenceId: string;
  checkoutUrl: string;
};

export type PagamentoPixResponse = {
  paymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
};

export type { AuthResponse, CadastroInicialRequest, LoginRequest } from "@/types/auth";
