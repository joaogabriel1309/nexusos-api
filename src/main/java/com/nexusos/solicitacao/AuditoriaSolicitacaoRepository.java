package com.nexusos.solicitacao;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditoriaSolicitacaoRepository extends JpaRepository<AuditoriaSolicitacao, UUID> {
    @EntityGraph(attributePaths = "usuario")
    List<AuditoriaSolicitacao> findBySolicitacaoIdOrderByCriadoEmDesc(UUID solicitacaoId);
}
