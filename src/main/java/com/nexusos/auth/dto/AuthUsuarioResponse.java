package com.nexusos.auth.dto;

import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;
import java.util.UUID;

public record AuthUsuarioResponse(
        UUID id,
        String nome,
        String email,
        PerfilUsuario perfil
) {
    public static AuthUsuarioResponse from(Usuario usuario) {
        return new AuthUsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil());
    }
}
