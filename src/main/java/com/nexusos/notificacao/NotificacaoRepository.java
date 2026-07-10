package com.nexusos.notificacao;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

    List<Notificacao> findTop20ByUsuarioIdOrderByCriadoEmDesc(UUID usuarioId);

    Page<Notificacao> findByUsuarioId(UUID usuarioId, Pageable pageable);

    Page<Notificacao> findByUsuarioIdAndLida(UUID usuarioId, boolean lida, Pageable pageable);

    Page<Notificacao> findByUsuarioIdAndTipo(UUID usuarioId, String tipo, Pageable pageable);

    Page<Notificacao> findByUsuarioIdAndTipoAndLida(UUID usuarioId, String tipo, boolean lida, Pageable pageable);

    long countByUsuarioIdAndLidaFalse(UUID usuarioId);

    List<Notificacao> findByUsuarioIdAndLidaFalse(UUID usuarioId);

    Optional<Notificacao> findByIdAndUsuarioId(UUID id, UUID usuarioId);

    @Query("""
            select distinct n.tipo
            from Notificacao n
            where n.usuario.id = :usuarioId
            order by n.tipo
            """)
    List<String> findTiposDisponiveisByUsuarioId(@Param("usuarioId") UUID usuarioId);

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
