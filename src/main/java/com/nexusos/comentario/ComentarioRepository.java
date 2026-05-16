package com.nexusos.comentario;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComentarioRepository extends JpaRepository<Comentario, UUID> {
    List<Comentario> findByOrdemServicoIdOrderByCriadoEmAsc(UUID ordemServicoId);
}
