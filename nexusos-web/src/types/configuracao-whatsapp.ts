export type WhatsappProvider = "CALLMEBOT" | "META";

export type ConfiguracaoWhatsapp = {
  habilitado: boolean;
  provedor: WhatsappProvider;
  numeroPadrao: string | null;
  metaPhoneNumberId: string | null;
  credencialConfigurada: boolean;
  configurado: boolean;
  atualizadoEm: string;
};

export type ConfiguracaoWhatsappPayload = {
  habilitado: boolean;
  provedor: WhatsappProvider;
  credencial: string | null;
  numeroPadrao: string | null;
  metaPhoneNumberId: string | null;
};

