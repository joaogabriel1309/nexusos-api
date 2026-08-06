package com.nexusos.solicitacao;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SolicitacaoPortalRateLimitServiceTest {
    @Test
    void trocarIpNaoContornaLimiteDeCriacaoDoMesmoPortal() {
        var service = new SolicitacaoPortalRateLimitService();

        for (int indice = 0; indice < 5; indice++) {
            service.registrarCriacao("token-do-cliente", "192.0.2." + indice);
        }

        assertThatThrownBy(() -> service.registrarCriacao("token-do-cliente", "198.51.100.10"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429 TOO_MANY_REQUESTS");
    }
}
