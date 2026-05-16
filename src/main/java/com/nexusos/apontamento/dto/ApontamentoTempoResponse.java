package com.nexusos.apontamento.dto;

import com.nexusos.apontamento.ApontamentoTempo;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ApontamentoTempoResponse(UUID id, UUID ordemServicoId, UUID usuarioId, String usuarioNome,
                                       String descricao, OffsetDateTime inicio, OffsetDateTime fim,
                                       long duracaoMinutos, OffsetDateTime criadoEm) {
    public static ApontamentoTempoResponse from(ApontamentoTempo apontamento) {
        return new ApontamentoTempoResponse(apontamento.getId(), apontamento.getOrdemServico().getId(),
                apontamento.getUsuario().getId(), apontamento.getUsuario().getNome(), apontamento.getDescricao(),
                apontamento.getInicio(), apontamento.getFim(), apontamento.getDuracaoMinutos(),
                apontamento.getCriadoEm());
    }
}
