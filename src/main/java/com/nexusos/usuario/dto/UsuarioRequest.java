package com.nexusos.usuario.dto;

import com.nexusos.usuario.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UsuarioRequest(
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Size(min = 6, max = 120) String senha,
        @NotNull PerfilUsuario perfil
) {
}
