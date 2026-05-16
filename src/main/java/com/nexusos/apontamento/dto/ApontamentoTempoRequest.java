package com.nexusos.apontamento.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ApontamentoTempoRequest(
        @NotNull UUID usuarioId,
        @NotBlank String descricao,
        @NotNull OffsetDateTime inicio,
        @NotNull OffsetDateTime fim
) {
}
