package com.nexusos.solicitacao;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, UUID> {
    @EntityGraph(attributePaths = {"cliente", "responsavel", "ordemServico"})
    List<Solicitacao> findAllByOrderByAtualizadoEmDesc();

    @EntityGraph(attributePaths = {"cliente", "responsavel", "ordemServico"})
    List<Solicitacao> findByClienteIdOrderByAtualizadoEmDesc(UUID clienteId);

    @EntityGraph(attributePaths = {"cliente", "responsavel", "ordemServico"})
    Optional<Solicitacao> findByIdAndClienteId(UUID id, UUID clienteId);

    @EntityGraph(attributePaths = {"cliente", "responsavel", "ordemServico"})
    @Query("select s from Solicitacao s where s.id = :id")
    Optional<Solicitacao> buscarDetalhe(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Solicitacao s where s.id = :id")
    Optional<Solicitacao> buscarParaAtualizacao(@Param("id") UUID id);

    long countByStatusIn(Collection<StatusSolicitacao> status);

    @Query(value = "select nextval('solicitacoes_codigo_seq')", nativeQuery = true)
    Long proximoCodigo();
}
