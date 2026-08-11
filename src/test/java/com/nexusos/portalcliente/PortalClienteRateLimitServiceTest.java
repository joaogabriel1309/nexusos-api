package com.nexusos.portalcliente;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class PortalClienteRateLimitServiceTest {

    @Test
    void limitaPagamentosPorTokenMesmoQuandoIpMuda() {
        var service = new PortalClienteRateLimitService();

        for (int indice = 0; indice < 10; indice++) {
            service.registrarPagamento("token-do-cliente", "192.0.2." + indice);
        }

        assertThatThrownBy(() -> service.registrarPagamento("token-do-cliente", "198.51.100.10"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429 TOO_MANY_REQUESTS");
    }

    @Test
    void proxyCompartilhadoNaoBloqueiaClientesDiferentesPrematuramente() {
        var service = new PortalClienteRateLimitService();

        for (int indice = 0; indice < 60; indice++) {
            service.registrarPagamento("token-do-cliente-" + indice, "10.0.0.10");
        }
    }
}
