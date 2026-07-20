package com.nexusos.auth;

import com.nexusos.usuario.Usuario;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update PasswordResetToken t set t.usadoEm = :agora where t.usuario = :usuario and t.usadoEm is null")
    int invalidarDoUsuario(Usuario usuario, OffsetDateTime agora);
}
