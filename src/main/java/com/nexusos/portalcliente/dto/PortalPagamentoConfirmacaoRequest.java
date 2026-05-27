package com.nexusos.portalcliente.dto;

import jakarta.validation.constraints.NotBlank;

public record PortalPagamentoConfirmacaoRequest(
        @NotBlank String paymentId
) {
}
