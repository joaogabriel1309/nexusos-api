package com.nexusos.configuracao;

import com.nexusos.configuracao.dto.ConfiguracaoEmpresaRequest;
import com.nexusos.configuracao.dto.ConfiguracaoEmpresaResponse;
import com.nexusos.exception.RecursoNaoEncontradoException;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConfiguracaoEmpresaService {
    private final ConfiguracaoEmpresaRepository repository;

    @Transactional(readOnly = true)
    public ConfiguracaoEmpresaResponse buscar() {
        return ConfiguracaoEmpresaResponse.from(buscarEntidade());
    }

    @Transactional
    public ConfiguracaoEmpresaResponse atualizar(ConfiguracaoEmpresaRequest request) {
        var configuracao = buscarEntidade();
        configuracao.setNome(request.nome().trim());
        configuracao.setLogo(normalizar(request.logo()));
        configuracao.setDocumento(normalizar(request.documento()));
        configuracao.setEmail(normalizar(request.email()) == null ? null : request.email().trim().toLowerCase(Locale.ROOT));
        configuracao.setTelefone(normalizar(request.telefone()));
        configuracao.setEndereco(normalizar(request.endereco()));
        configuracao.setCorPrincipal(request.corPrincipal().toUpperCase(Locale.ROOT));
        return ConfiguracaoEmpresaResponse.from(repository.save(configuracao));
    }

    private ConfiguracaoEmpresa buscarEntidade() {
        return repository.findById(ConfiguracaoEmpresa.ID)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Configurações da empresa não encontradas."));
    }

    private String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
