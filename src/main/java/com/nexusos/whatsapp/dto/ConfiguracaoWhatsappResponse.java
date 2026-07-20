package com.nexusos.whatsapp.dto;

import com.nexusos.whatsapp.ConfiguracaoWhatsapp;
import com.nexusos.whatsapp.WhatsappProvider;
import java.time.OffsetDateTime;

public record ConfiguracaoWhatsappResponse(
        boolean habilitado,
        WhatsappProvider provedor,
        String numeroPadrao,
        String metaPhoneNumberId,
        boolean credencialConfigurada,
        boolean configurado,
        OffsetDateTime atualizadoEm
) {
    public static ConfiguracaoWhatsappResponse from(ConfiguracaoWhatsapp configuracao) {
        return new ConfiguracaoWhatsappResponse(configuracao.isHabilitado(), configuracao.getProvedor(),
                configuracao.getNumeroPadrao(), configuracao.getMetaPhoneNumberId(),
                configuracao.getCredencialCifrada() != null && !configuracao.getCredencialCifrada().isBlank(),
                configuracao.configurado(), configuracao.getAtualizadoEm());
    }
}

