package com.nexusos.github;
import com.nexusos.exception.*;
import com.nexusos.github.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @RequiredArgsConstructor
public class ConfiguracaoGithubService {
    private final ConfiguracaoGithubRepository repository; private final GithubTokenCipher cipher; private final GithubApiClient client;
    @Transactional(readOnly=true) public ConfiguracaoGithubResponse buscar(){ return ConfiguracaoGithubResponse.from(buscarEntidade()); }
    @Transactional public ConfiguracaoGithubResponse atualizar(ConfiguracaoGithubRequest r){ var c=buscarEntidade(); c.setHabilitado(r.habilitado()); c.setOwner(norm(r.owner())); c.setRepositorio(norm(r.repositorio())); c.setBranchPrincipal(norm(r.branchPrincipal())); if(r.token()!=null&&!r.token().isBlank()) c.setTokenCriptografado(cipher.encrypt(r.token().trim())); if(c.isHabilitado()&&!c.configurado()) throw new RegraNegocioException("Preencha owner, repositorio, token e branch principal antes de habilitar o GitHub."); return ConfiguracaoGithubResponse.from(repository.save(c)); }
    public void testar(){ var c=validarAtivaOuConfigurada(false); client.testar(c.getOwner(),c.getRepositorio(),token(c)); }
    @Transactional(readOnly=true) public ConfiguracaoGithub validarParaSincronizar(){ return validarAtivaOuConfigurada(true); }
    public String token(ConfiguracaoGithub c){ return cipher.decrypt(c.getTokenCriptografado()); }
    private ConfiguracaoGithub validarAtivaOuConfigurada(boolean exigirAtiva){ var c=buscarEntidade(); if((exigirAtiva&&!c.isHabilitado())||!c.configurado()) throw new RegraNegocioException("A integracao GitHub esta desativada ou incompleta. Solicite a configuracao a um administrador."); return c; }
    private ConfiguracaoGithub buscarEntidade(){ return repository.findById(ConfiguracaoGithub.ID).orElseThrow(()->new RecursoNaoEncontradoException("Configuracao GitHub nao encontrada.")); }
    private String norm(String s){ return s==null||s.isBlank()?null:s.trim(); }
}
