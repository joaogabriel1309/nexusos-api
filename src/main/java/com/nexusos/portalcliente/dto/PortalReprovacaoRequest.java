package com.nexusos.portalcliente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PortalReprovacaoRequest(
        @NotBlank(message = "Informe o motivo da solicitacao de ajuste.")
        @Size(max = 2000, message = "O motivo deve ter no maximo 2000 caracteres.")
        String observacao
) {
}
