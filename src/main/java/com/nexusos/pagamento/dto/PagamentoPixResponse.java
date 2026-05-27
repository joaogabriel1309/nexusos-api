package com.nexusos.pagamento.dto;

public record PagamentoPixResponse(
        String paymentId,
        String status,
        String qrCode,
        String qrCodeBase64,
        String ticketUrl
) {
}
