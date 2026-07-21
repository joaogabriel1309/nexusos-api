export type ConfiguracaoPagamento = {
  mercadoPagoChavePublica: string | null;
  mercadoPagoTokenConfigurado: boolean;
  expiracaoLinkMinutos: number;
  cobrarAutomaticamenteOsFinalizada: boolean;
  permitirOsSemCobranca: boolean;
  atualizadoEm: string;
};

export type ConfiguracaoPagamentoPayload = {
  mercadoPagoToken: string | null;
  mercadoPagoChavePublica: string | null;
  expiracaoLinkMinutos: number;
  cobrarAutomaticamenteOsFinalizada: boolean;
  permitirOsSemCobranca: boolean;
};

