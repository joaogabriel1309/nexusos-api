package com.nexusos.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail valido.")
        @Size(max = 160)
        String email) {
}
