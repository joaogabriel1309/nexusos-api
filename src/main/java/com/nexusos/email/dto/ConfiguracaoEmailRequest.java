package com.nexusos.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ConfiguracaoEmailRequest(
        @NotNull Boolean habilitado,
        @Size(max = 255) String smtpHost,
        @Min(1) @Max(65535) Integer smtpPort,
        @Size(max = 255) String smtpUsuario,
        @Size(max = 500) String smtpSenha,
        @Email @Size(max = 255) String emailRemetente
) {
}
