package com.nexusos.email;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoEmailRepository extends JpaRepository<ConfiguracaoEmail, UUID> {
}
