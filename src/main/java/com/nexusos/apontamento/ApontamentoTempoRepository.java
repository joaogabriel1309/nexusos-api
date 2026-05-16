package com.nexusos.apontamento;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApontamentoTempoRepository extends JpaRepository<ApontamentoTempo, UUID> {
    List<ApontamentoTempo> findByOrdemServicoIdOrderByInicioDesc(UUID ordemServicoId);
}
