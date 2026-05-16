package com.nexusos.checklist.dto;

import com.nexusos.checklist.ChecklistItem;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ChecklistResponse(UUID id, UUID ordemServicoId, String descricao, boolean obrigatorio,
                                boolean concluido, OffsetDateTime criadoEm, OffsetDateTime concluidoEm) {
    public static ChecklistResponse from(ChecklistItem item) {
        return new ChecklistResponse(item.getId(), item.getOrdemServico().getId(), item.getDescricao(),
                item.isObrigatorio(), item.isConcluido(), item.getCriadoEm(), item.getConcluidoEm());
    }
}
