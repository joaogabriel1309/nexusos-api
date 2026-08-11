package com.nexusos.portalcliente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PortalPagamentoConfirmacaoRequest(
        @NotBlank @Size(max = 120) @Pattern(regexp = "^[A-Za-z0-9._-]+$") String paymentId
) {
}
