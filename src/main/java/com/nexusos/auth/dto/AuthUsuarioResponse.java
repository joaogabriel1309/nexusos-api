package com.nexusos.auth.dto;

import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;

public record AuthUsuarioResponse(
        String email,
        PerfilUsuario perfil
) {
    public static AuthUsuarioResponse from(Usuario usuario) {
        return new AuthUsuarioResponse(usuario.getEmail(), usuario.getPerfil());
    }
}
