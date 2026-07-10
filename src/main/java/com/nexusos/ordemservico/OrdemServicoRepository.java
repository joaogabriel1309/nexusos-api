package com.nexusos.ordemservico;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrdemServicoRepository extends JpaRepository<OrdemServico, UUID> {

    List<OrdemServico> findAllByOrderByAtualizadoEmDesc();

    List<OrdemServico> findByResponsavelEmailOrderByAtualizadoEmDesc(String email);

    Optional<OrdemServico> findByIdAndResponsavelEmail(UUID id, String email);

    List<OrdemServico> findByClienteIdOrderByAtualizadoEmDesc(UUID clienteId);

    Optional<OrdemServico> findByMercadoPagoPaymentId(String mercadoPagoPaymentId);

    @Query(value = "select nextval('ordens_servico_codigo_seq')", nativeQuery = true)
    Long proximoCodigo();

    long countByStatus(StatusOS status);

    long countByStatusNot(StatusOS status);

    long countByPrioridade(PrioridadeOS prioridade);

    @Query(value = """
            select coalesce(avg(extract(epoch from (finalizado_em - criado_em)) / 3600), 0)
            from ordens_servico
            where status = 'FINALIZADA' and finalizado_em is not null
            """, nativeQuery = true)
    double calcularTempoMedioFinalizacaoHoras();
}
