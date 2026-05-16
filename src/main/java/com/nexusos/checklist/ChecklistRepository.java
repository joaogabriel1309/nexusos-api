package com.nexusos.checklist;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistRepository extends JpaRepository<ChecklistItem, UUID> {
    List<ChecklistItem> findByOrdemServicoIdOrderByCriadoEmAsc(UUID ordemServicoId);
}
