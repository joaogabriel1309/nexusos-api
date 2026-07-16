package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelamentoOrdemServicoRequest(
        @NotBlank(message = "Informe o motivo do cancelamento.")
        @Size(max = 1000, message = "O motivo do cancelamento deve ter no maximo 1000 caracteres.")
        String motivo
) {
}
