package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.StatusOS;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record StatusUpdateRequest(
        @NotNull StatusOS status,
        UUID usuarioId,
        String descricao
) {
}
