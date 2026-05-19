package com.nexusos.projeto.dto;

import com.nexusos.projeto.Projeto;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjetoResponse(
        UUID id,
        String nome,
        String descricao,
        boolean ativo,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm
) {
    public static ProjetoResponse from(Projeto projeto) {
        return new ProjetoResponse(
                projeto.getId(),
                projeto.getNome(),
                projeto.getDescricao(),
                projeto.isAtivo(),
                projeto.getCriadoEm(),
                projeto.getAtualizadoEm()
        );
    }
}
