package com.nexusos.auditoria.dto;

import com.nexusos.auditoria.AuditoriaOS;
import com.nexusos.ordemservico.StatusOS;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditoriaOSResponse(
        UUID id,
        UUID ordemServicoId,
        UUID usuarioId,
        String usuarioNome,
        String tipoEvento,
        String descricao,
        StatusOS statusAnterior,
        StatusOS statusNovo,
        OffsetDateTime criadoEm
) {
    public static AuditoriaOSResponse from(AuditoriaOS auditoria) {
        var usuario = auditoria.getUsuario();
        return new AuditoriaOSResponse(
                auditoria.getId(),
                auditoria.getOrdemServico().getId(),
                usuario != null ? usuario.getId() : null,
                usuario != null ? usuario.getNome() : null,
                auditoria.getTipoEvento(),
                auditoria.getDescricao(),
                auditoria.getStatusAnterior(),
                auditoria.getStatusNovo(),
                auditoria.getCriadoEm()
        );
    }
}
