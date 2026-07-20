package com.nexusos.configuracao.dto;

import com.nexusos.configuracao.ConfiguracaoEmpresa;
import java.time.OffsetDateTime;

public record ConfiguracaoEmpresaResponse(
        String nome,
        String logo,
        String documento,
        String email,
        String telefone,
        String endereco,
        String corPrincipal,
        OffsetDateTime atualizadoEm
) {
    public static ConfiguracaoEmpresaResponse from(ConfiguracaoEmpresa configuracao) {
        return new ConfiguracaoEmpresaResponse(configuracao.getNome(), configuracao.getLogo(),
                configuracao.getDocumento(), configuracao.getEmail(), configuracao.getTelefone(),
                configuracao.getEndereco(), configuracao.getCorPrincipal(), configuracao.getAtualizadoEm());
    }
}
