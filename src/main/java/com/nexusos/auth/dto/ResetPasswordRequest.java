package com.nexusos.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Informe o token.") @Size(max = 128) String token,
        @NotBlank(message = "Informe a nova senha.")
        @Size(max = 120)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
                message = "A senha deve ter ao menos 8 caracteres, com maiuscula, minuscula e numero.")
        String novaSenha) {
}
