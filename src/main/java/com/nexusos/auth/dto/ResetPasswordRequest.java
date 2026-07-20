package com.nexusos.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @NotBlank(message = "Informe o token.") String token,
        @NotBlank(message = "Informe a nova senha.")
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
                message = "A senha deve ter ao menos 8 caracteres, com maiuscula, minuscula e numero.")
        String novaSenha) {
}
