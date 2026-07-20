package com.nexusos.auth;

import com.nexusos.usuario.Usuario;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revogadoEm = :agora where t.usuario = :usuario and t.revogadoEm is null")
    int revogarDoUsuario(Usuario usuario, OffsetDateTime agora);
}
