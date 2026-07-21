package com.nexusos.configuracao;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoOSRepository extends JpaRepository<ConfiguracaoOS, UUID> {
}
