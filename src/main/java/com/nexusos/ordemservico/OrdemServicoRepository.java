package com.nexusos.ordemservico;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrdemServicoRepository extends JpaRepository<OrdemServico, UUID> {

    @Query("""
            select distinct os from OrdemServico os
            join fetch os.cliente
            left join fetch os.responsavel
            left join fetch os.projeto
            where (os.prazo between :inicio and :fim
                   or function('date', os.finalizadoEm) between :inicio and :fim)
              and (:responsavelId is null or os.responsavel.id = :responsavelId)
              and (:clienteId is null or os.cliente.id = :clienteId)
              and (:projetoId is null or os.projeto.id = :projetoId)
              and (:prioridade is null or os.prioridade = :prioridade)
              and (:status is null or os.status = :status)
              and (:emailResponsavel is null or os.responsavel.email = :emailResponsavel)
            """)
    List<OrdemServico> buscarParaCalendario(
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim,
            @Param("responsavelId") UUID responsavelId,
            @Param("clienteId") UUID clienteId,
            @Param("projetoId") UUID projetoId,
            @Param("prioridade") PrioridadeOS prioridade,
            @Param("status") StatusOS status,
            @Param("emailResponsavel") String emailResponsavel
    );

    List<OrdemServico> findAllByOrderByAtualizadoEmDesc();

    List<OrdemServico> findByResponsavelEmailOrderByAtualizadoEmDesc(String email);

    @Query("""
            select os from OrdemServico os
            where os.responsavel.id = :responsavelId and os.status <> :status
            order by os.sequenciaExecucao asc nulls last, os.atualizadoEm desc, os.codigo desc
            """)
    List<OrdemServico> findFilaByResponsavelId(UUID responsavelId, StatusOS status);

    Optional<OrdemServico> findByIdAndResponsavelEmail(UUID id, String email);

    List<OrdemServico> findByResponsavelIsNotNullAndStatusNot(StatusOS status);

    List<OrdemServico> findByClienteIdOrderByAtualizadoEmDesc(UUID clienteId);

    Optional<OrdemServico> findByMercadoPagoPaymentId(String mercadoPagoPaymentId);

    @Query(value = "select nextval('ordens_servico_codigo_seq')", nativeQuery = true)
    Long proximoCodigo();

    long countByStatus(StatusOS status);

    long countByStatusNot(StatusOS status);

    long countByStatusNotAndPrazoBefore(StatusOS status, LocalDate prazo);

    long countByStatusNotAndPrazo(StatusOS status, LocalDate prazo);

    long countByStatusNotAndResponsavelIsNull(StatusOS status);

    long countByPrioridade(PrioridadeOS prioridade);

    long countByStatusNotAndPrioridadeAndPrazoBefore(StatusOS status, PrioridadeOS prioridade, LocalDate prazo);

    long countByStatusAndFinalizadoEmGreaterThanEqualAndFinalizadoEmLessThan(
            StatusOS status,
            OffsetDateTime inicio,
            OffsetDateTime fim
    );

    @Query(value = """
            select coalesce(avg(extract(epoch from (finalizado_em - criado_em)) / 3600), 0)
            from ordens_servico
            where status = 'FINALIZADA' and finalizado_em is not null
            """, nativeQuery = true)
    double calcularTempoMedioFinalizacaoHoras();
}
