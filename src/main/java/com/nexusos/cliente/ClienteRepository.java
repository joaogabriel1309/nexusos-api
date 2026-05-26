package com.nexusos.cliente;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    Optional<Cliente> findByDocumento(String documento);

    Optional<Cliente> findByTokenAcesso(String tokenAcesso);
}
