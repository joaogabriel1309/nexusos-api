export type LoginRequest = {
  email: string;
  senha: string;
};

export type AuthUsuario = {
  email: string;
  perfil: "ADMIN" | "DESENVOLVEDOR" | "ANALISTA" | "CLIENTE";
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType: "Bearer";
};

export type CadastroInicialRequest = {
  nome: string;
  email: string;
  senha: string;
  perfil: "ADMIN";
};
