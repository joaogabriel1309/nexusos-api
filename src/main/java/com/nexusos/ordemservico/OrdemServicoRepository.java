package com.nexusos.ordemservico;

import java.util.UUID;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrdemServicoRepository extends JpaRepository<OrdemServico, UUID> {

    List<OrdemServico> findAllByOrderByAtualizadoEmDesc();

    List<OrdemServico> findByResponsavelEmailOrderByAtualizadoEmDesc(String email);

    Optional<OrdemServico> findByIdAndResponsavelEmail(UUID id, String email);

    List<OrdemServico> findByResponsavelIsNotNullAndStatusNot(StatusOS status);

    List<OrdemServico> findByClienteIdOrderByAtualizadoEmDesc(UUID clienteId);

    Optional<OrdemServico> findByMercadoPagoPaymentId(String mercadoPagoPaymentId);

    @Query(value = "select nextval('ordens_servico_codigo_seq')", nativeQuery = true)
    Long proximoCodigo();

    long countByStatus(StatusOS status);

    long countByStatusNot(StatusOS status);

    long countByPrioridade(PrioridadeOS prioridade);

    long countByStatusNotAndPrazoBefore(StatusOS status, LocalDate prazo);

    long countByStatusNotAndPrazo(StatusOS status, LocalDate prazo);

    long countByStatusNotAndResponsavelIsNull(StatusOS status);

    long countByStatusNotAndPrioridadeAndPrazoBefore(StatusOS status, PrioridadeOS prioridade, LocalDate prazo);

    @Query(value = """
            select coalesce(avg(extract(epoch from (finalizado_em - criado_em)) / 3600), 0)
            from ordens_servico
            where status = 'FINALIZADA' and finalizado_em is not null
            """, nativeQuery = true)
    double calcularTempoMedioFinalizacaoHoras();
}
