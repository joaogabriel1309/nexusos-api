export type PerfilUsuario = "ADMIN" | "DESENVOLVEDOR";

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

export type TipoEventoCalendario = "PRAZO_OS" | "VENCIMENTO" | "ENTREGA_PREVISTA" | "EVENTO_IMPORTANTE";

export type EventoCalendario = {
  id: string; tipo: TipoEventoCalendario; data: string; ordemServicoId: string;
  ordemServicoCodigo: number; titulo: string; clienteId: string; clienteNome: string;
  projetoId?: string; projetoNome?: string; responsavelId?: string; responsavelNome?: string;
  prioridade: PrioridadeOS; status: StatusOS;
};

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
  tokenAcessoExpiraEm?: string;
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
  sequenciaExecucao?: number;
  entendimento?: string;
  impacto?: string;
  riscos?: string;
  estimativaHoras?: number;
  valorTotalEstimado?: number;
  cobrar?: boolean;
  paga?: boolean;
  pagamentoIniciado?: boolean;
  descricaoFinalizacao?: string;
  commitsFinalizacao?: string;
  branchFinalizacao?: string;
  arquivosAlteradosFinalizacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  ordensVinculadas: OrdemServicoVinculada[];
};

export type OrdemServicoVinculada = {
  id: string;
  codigo: number;
  titulo: string;
  status: StatusOS;
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
  observacaoAprovacaoCliente?: string;
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

export type Notificacao = {
  id: string;
  ordemServicoId?: string;
  ordemServicoCodigo?: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  lidaEm?: string;
};

export type NotificacaoResumo = {
  naoLidas: number;
  itens: Notificacao[];
};

export type NotificacaoPagina = {
  naoLidas: number;
  totalItens: number;
  pagina: number;
  tamanho: number;
  totalPaginas: number;
  tiposDisponiveis: string[];
  itens: Notificacao[];
};

export type TipoPreferenciaNotificacao =
  | "OS_ATRIBUIDA"
  | "PRAZO_VENCIDO"
  | "APROVACAO_CLIENTE"
  | "PAGAMENTO"
  | "COMENTARIO"
  | "ALTERACAO_STATUS";

export type PreferenciaNotificacao = {
  tipo: TipoPreferenciaNotificacao;
  habilitada: boolean;
};

export type PreferenciasNotificacao = {
  preferencias: PreferenciaNotificacao[];
};

export type AuditoriaOS = {
  id: string;
  ordemServicoId: string;
  usuarioId?: string;
  usuarioNome?: string;
  tipoEvento: string;
  descricao: string;
  statusAnterior?: StatusOS;
  statusNovo?: StatusOS;
  criadoEm: string;
};

export type { AuthResponse, CadastroInicialRequest, LoginRequest } from "@/types/auth";
