package com.nexusos.email.dto;

import com.nexusos.email.ConfiguracaoEmail;
import java.time.OffsetDateTime;

public record ConfiguracaoEmailResponse(
        boolean habilitado,
        String smtpHost,
        Integer smtpPort,
        String smtpUsuario,
        String emailRemetente,
        boolean senhaConfigurada,
        boolean configurado,
        OffsetDateTime atualizadoEm
) {
    public static ConfiguracaoEmailResponse from(ConfiguracaoEmail configuracao) {
        return new ConfiguracaoEmailResponse(configuracao.isHabilitado(), configuracao.getSmtpHost(),
                configuracao.getSmtpPort(), configuracao.getSmtpUsuario(), configuracao.getEmailRemetente(),
                configuracao.getSmtpSenhaCifrada() != null && !configuracao.getSmtpSenhaCifrada().isBlank(),
                configuracao.configurado(), configuracao.getAtualizadoEm());
    }
}
