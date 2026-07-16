package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReaberturaOrdemServicoRequest(
        @NotBlank(message = "O motivo da reabertura e obrigatorio.")
        @Size(max = 1000, message = "O motivo da reabertura deve ter no maximo 1000 caracteres.")
        String motivo
) {
}
