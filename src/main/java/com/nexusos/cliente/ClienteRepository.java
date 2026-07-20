package com.nexusos.cliente;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    Optional<Cliente> findByDocumento(String documento);

    Optional<Cliente> findByTokenAcesso(String tokenAcesso);

    List<Cliente> findByNomeContainingIgnoreCaseOrderByNomeAsc(String termo, Pageable pageable);
}
