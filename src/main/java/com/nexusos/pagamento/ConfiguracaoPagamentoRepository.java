package com.nexusos.pagamento;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoPagamentoRepository extends JpaRepository<ConfiguracaoPagamento, UUID> {}

