package com.nexusos.usuario.dto;

import com.nexusos.usuario.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UsuarioUpdateRequest(
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Email @Size(max = 160) String email,
        @Size(max = 120)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
                message = "A senha deve ter ao menos 8 caracteres, com maiuscula, minuscula e numero.")
        String senha,
        @NotNull PerfilUsuario perfil,
        @NotNull Boolean ativo
) {
}
