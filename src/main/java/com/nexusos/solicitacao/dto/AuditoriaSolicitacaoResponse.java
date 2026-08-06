package com.nexusos.solicitacao.dto;

import com.nexusos.solicitacao.AuditoriaSolicitacao;
import com.nexusos.solicitacao.OrigemSolicitacao;
import com.nexusos.solicitacao.StatusSolicitacao;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditoriaSolicitacaoResponse(
        UUID id,
        UUID usuarioId,
        String usuarioNome,
        OrigemSolicitacao origem,
        String tipoEvento,
        String descricao,
        StatusSolicitacao statusAnterior,
        StatusSolicitacao statusNovo,
        OffsetDateTime criadoEm
) {
    public static AuditoriaSolicitacaoResponse from(AuditoriaSolicitacao auditoria) {
        var usuario = auditoria.getUsuario();
        return new AuditoriaSolicitacaoResponse(
                auditoria.getId(), usuario != null ? usuario.getId() : null,
                usuario != null ? usuario.getNome() : null, auditoria.getOrigem(),
                auditoria.getTipoEvento(), auditoria.getDescricao(), auditoria.getStatusAnterior(),
                auditoria.getStatusNovo(), auditoria.getCriadoEm());
    }
}
