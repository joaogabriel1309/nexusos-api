package com.nexusos.solicitacao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnexoSolicitacaoRepository extends JpaRepository<AnexoSolicitacao, UUID> {
    List<AnexoSolicitacao> findBySolicitacaoIdOrderByCriadoEmAsc(UUID solicitacaoId);
    Optional<AnexoSolicitacao> findByIdAndSolicitacaoId(UUID id, UUID solicitacaoId);
    long countBySolicitacaoId(UUID solicitacaoId);
}
