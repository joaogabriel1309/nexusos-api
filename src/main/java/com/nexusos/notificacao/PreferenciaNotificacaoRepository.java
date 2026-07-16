package com.nexusos.notificacao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreferenciaNotificacaoRepository extends JpaRepository<PreferenciaNotificacao, UUID> {

    List<PreferenciaNotificacao> findByUsuarioId(UUID usuarioId);

    Optional<PreferenciaNotificacao> findByUsuarioIdAndTipo(UUID usuarioId, TipoPreferenciaNotificacao tipo);

    boolean existsByUsuarioIdAndTipoAndHabilitadaFalse(UUID usuarioId, TipoPreferenciaNotificacao tipo);
}
