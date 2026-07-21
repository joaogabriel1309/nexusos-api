package com.nexusos.configuracao;

import com.nexusos.configuracao.dto.*;
import com.nexusos.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ConfiguracaoIAService {
    private final ConfiguracaoIARepository repository;
    private final IACredentialCipher cipher;
    @Transactional(readOnly = true) public ConfiguracaoIA buscarEntidade() {
        return repository.findById(ConfiguracaoIA.ID)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Configuracao de IA nao encontrada."));
    }
    @Transactional(readOnly = true) public ConfiguracaoIAResponse buscar() { return ConfiguracaoIAResponse.from(buscarEntidade()); }
    @Transactional public ConfiguracaoIAResponse atualizar(ConfiguracaoIARequest r) {
        var c = buscarEntidade();
        var novaChave = r.apiKey() == null ? null : r.apiKey().trim();
        if (r.habilitado() && (novaChave == null || novaChave.isBlank())
                && (c.getApiKeyCriptografada() == null || c.getApiKeyCriptografada().isBlank())) {
            throw new RegraNegocioException("Informe a chave da API antes de habilitar a integracao de IA.");
        }
        c.setHabilitado(r.habilitado()); c.setApiUrl(r.apiUrl().trim()); c.setModelo(r.modelo().trim());
        c.setTemperatura(r.temperatura());
        if (novaChave != null && !novaChave.isBlank()) c.setApiKeyCriptografada(cipher.encrypt(novaChave));
        return ConfiguracaoIAResponse.from(repository.save(c));
    }
    public String chave(ConfiguracaoIA configuracao) { return cipher.decrypt(configuracao.getApiKeyCriptografada()); }
}
