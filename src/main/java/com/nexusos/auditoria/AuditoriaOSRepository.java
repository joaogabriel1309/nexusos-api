package com.nexusos.auditoria;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditoriaOSRepository extends JpaRepository<AuditoriaOS, UUID> {

    List<AuditoriaOS> findByOrdemServicoIdOrderByCriadoEmDesc(UUID ordemServicoId);
}
