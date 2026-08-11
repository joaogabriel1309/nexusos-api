package com.nexusos.cliente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ClienteUpdateRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank @Size(max = 32) String documento,
        @NotBlank @Email @Size(max = 160) String email,
        @Size(max = 32) String telefone,
        @NotNull @PositiveOrZero BigDecimal valorHora,
        Boolean enviarEmail,
        Boolean enviarWhatsapp,
        @NotNull Boolean ativo
) {
}
