package com.nexusos.notificacao;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

    List<Notificacao> findTop20ByUsuarioIdOrderByCriadoEmDesc(UUID usuarioId);

    long countByUsuarioIdAndLidaFalse(UUID usuarioId);

    List<Notificacao> findByUsuarioIdAndLidaFalse(UUID usuarioId);

    Optional<Notificacao> findByIdAndUsuarioId(UUID id, UUID usuarioId);

    boolean existsByUsuarioIdAndOrdemServicoIdAndTipoAndReferenciaData(
            UUID usuarioId,
            UUID ordemServicoId,
            String tipo,
            LocalDate referenciaData
    );

    boolean existsByUsuarioIdAndOrdemServicoIdAndTipoAndReferenciaDataIsNull(
            UUID usuarioId,
            UUID ordemServicoId,
            String tipo
    );
}
