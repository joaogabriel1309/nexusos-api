package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SequenciaUpdateRequest(
        @NotNull @Min(1) Integer posicao
) {
}
