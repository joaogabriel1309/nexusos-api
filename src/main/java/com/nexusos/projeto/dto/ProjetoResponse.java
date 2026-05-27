package com.nexusos.projeto.dto;

import com.nexusos.projeto.Projeto;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjetoResponse(
        UUID id,
        String nome,
        String descricao,
        UUID clienteId,
        String clienteNome,
        boolean ativo,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm
) {
    public static ProjetoResponse from(Projeto projeto) {
        return new ProjetoResponse(
                projeto.getId(),
                projeto.getNome(),
                projeto.getDescricao(),
                projeto.getCliente() != null ? projeto.getCliente().getId() : null,
                projeto.getCliente() != null ? projeto.getCliente().getNome() : null,
                projeto.isAtivo(),
                projeto.getCriadoEm(),
                projeto.getAtualizadoEm()
        );
    }
}
