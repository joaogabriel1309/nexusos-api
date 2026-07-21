package com.nexusos.pagamento.dto;

import com.nexusos.pagamento.ConfiguracaoPagamento;
import java.time.OffsetDateTime;

public record ConfiguracaoPagamentoResponse(
        String mercadoPagoChavePublica,
        boolean mercadoPagoTokenConfigurado,
        Integer expiracaoLinkMinutos,
        Boolean cobrarAutomaticamenteOsFinalizada,
        Boolean permitirOsSemCobranca,
        OffsetDateTime atualizadoEm
) {
    public static ConfiguracaoPagamentoResponse from(ConfiguracaoPagamento c, boolean tokenDoAmbiente) {
        return new ConfiguracaoPagamentoResponse(c.getMercadoPagoChavePublica(),
                tokenDoAmbiente || (c.getMercadoPagoTokenCifrado() != null && !c.getMercadoPagoTokenCifrado().isBlank()),
                c.getExpiracaoLinkMinutos(), c.getCobrarAutomaticamenteOsFinalizada(),
                c.getPermitirOsSemCobranca(), c.getAtualizadoEm());
    }
}

