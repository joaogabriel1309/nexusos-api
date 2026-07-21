import { api } from "@/lib/api";
import type { ConfiguracaoGithub, ConfiguracaoGithubPayload } from "@/types/configuracao-github";
export const configuracaoGithubService = {
 async buscar(){ return (await api.get<ConfiguracaoGithub>("/configuracoes/github")).data; },
 async atualizar(payload: ConfiguracaoGithubPayload){ return (await api.put<ConfiguracaoGithub>("/configuracoes/github",payload)).data; },
 async testar(){ await api.post("/configuracoes/github/testar-conexao"); }
};
