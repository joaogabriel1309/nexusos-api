package com.nexusos.anexo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnexoRepository extends JpaRepository<Anexo, UUID> {
    List<Anexo> findByOrdemServicoIdOrderByCriadoEmDesc(UUID ordemServicoId);
    long countByOrdemServicoId(UUID ordemServicoId);
}
