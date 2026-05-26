package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.NotNull;

public record PagamentoUpdateRequest(
        @NotNull Boolean paga
) {
}
