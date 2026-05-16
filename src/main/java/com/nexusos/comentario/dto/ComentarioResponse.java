package com.nexusos.comentario.dto;

import com.nexusos.comentario.Comentario;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ComentarioResponse(UUID id, UUID ordemServicoId, UUID usuarioId, String usuarioNome, String mensagem,
                                 OffsetDateTime criadoEm) {
    public static ComentarioResponse from(Comentario comentario) {
        return new ComentarioResponse(comentario.getId(), comentario.getOrdemServico().getId(),
                comentario.getUsuario().getId(), comentario.getUsuario().getNome(), comentario.getMensagem(),
                comentario.getCriadoEm());
    }
}
