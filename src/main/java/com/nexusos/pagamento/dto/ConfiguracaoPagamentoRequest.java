package com.nexusos.pagamento.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ConfiguracaoPagamentoRequest(
        @Size(max = 2000) String mercadoPagoToken,
        @Size(max = 255) String mercadoPagoChavePublica,
        @NotNull @Min(5) @Max(10080) Integer expiracaoLinkMinutos,
        @NotNull Boolean cobrarAutomaticamenteOsFinalizada,
        @NotNull Boolean permitirOsSemCobranca
) {}

