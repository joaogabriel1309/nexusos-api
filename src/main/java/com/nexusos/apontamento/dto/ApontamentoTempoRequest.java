package com.nexusos.apontamento.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record ApontamentoTempoRequest(
        @NotBlank @Size(max = 1000) String descricao,
        @NotNull OffsetDateTime inicio,
        @NotNull OffsetDateTime fim
) {
}
