package com.nexusos.usuario;

import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmail(String email);

    List<Usuario> findByPerfilAndAtivoTrue(PerfilUsuario perfil);

    boolean existsByEmail(String email);
}
