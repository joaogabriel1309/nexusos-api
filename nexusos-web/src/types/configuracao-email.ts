export type ConfiguracaoEmail = {
  habilitado: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsuario: string | null;
  emailRemetente: string | null;
  senhaConfigurada: boolean;
  configurado: boolean;
  atualizadoEm: string;
};

export type ConfiguracaoEmailPayload = {
  habilitado: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsuario: string | null;
  smtpSenha: string | null;
  emailRemetente: string | null;
};
