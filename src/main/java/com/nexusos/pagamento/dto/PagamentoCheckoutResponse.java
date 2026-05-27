package com.nexusos.pagamento.dto;

public record PagamentoCheckoutResponse(
        String preferenceId,
        String checkoutUrl
) {
}
