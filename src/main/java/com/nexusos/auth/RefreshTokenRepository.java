package com.nexusos.auth;

import com.nexusos.usuario.Usuario;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from RefreshToken t where t.tokenHash = :tokenHash")
    Optional<RefreshToken> findForUpdateByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revogadoEm = :agora where t.usuario = :usuario and t.revogadoEm is null")
    int revogarDoUsuario(Usuario usuario, OffsetDateTime agora);
}
