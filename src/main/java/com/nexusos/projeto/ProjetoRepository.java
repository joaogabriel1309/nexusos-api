package com.nexusos.projeto;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ProjetoRepository extends JpaRepository<Projeto, UUID> {
    List<Projeto> findByNomeContainingIgnoreCaseOrderByNomeAsc(String termo, Pageable pageable);
}
