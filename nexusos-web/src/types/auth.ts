export type LoginRequest = {
  email: string;
  senha: string;
};

export type AuthUsuario = {
  email: string;
  perfil: "ADMIN" | "DESENVOLVEDOR";
};

export type AuthResponse = {
  tokenType: "Bearer";
  usuario: AuthUsuario;
};

export type CadastroInicialRequest = {
  nome: string;
  email: string;
  senha: string;
  perfil: "ADMIN";
};
