package com.nexusos.usuario.dto;

import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UsuarioResponse(
        UUID id,
        String nome,
        String email,
        PerfilUsuario perfil,
        boolean ativo,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm
) {
    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getPerfil(),
                usuario.isAtivo(),
                usuario.getCriadoEm(),
                usuario.getAtualizadoEm()
        );
    }
}
