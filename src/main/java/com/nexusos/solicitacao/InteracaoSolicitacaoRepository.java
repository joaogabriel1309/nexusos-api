package com.nexusos.solicitacao;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InteracaoSolicitacaoRepository extends JpaRepository<InteracaoSolicitacao, UUID> {
    @EntityGraph(attributePaths = "usuario")
    List<InteracaoSolicitacao> findBySolicitacaoIdOrderByCriadoEmAsc(UUID solicitacaoId);
}
