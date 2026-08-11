package com.nexusos.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class LoginRateLimitServiceTest {

    @Test
    void bloqueiaLoginAposCincoFalhas() {
        var service = new LoginRateLimitService();
        for (int indice = 0; indice < 5; indice++) {
            service.verificar("usuario@nexusos.com", "127.0.0.1");
            service.registrarFalha("usuario@nexusos.com", "127.0.0.1");
        }

        assertThatThrownBy(() -> service.verificar("usuario@nexusos.com", "127.0.0.1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void limitaSolicitacoesDeRecuperacaoDeSenha() {
        var service = new LoginRateLimitService();
        for (int indice = 0; indice < 3; indice++) {
            service.registrarRecuperacao("usuario@nexusos.com", "127.0.0.1");
        }

        assertThatThrownBy(() -> service.registrarRecuperacao("usuario@nexusos.com", "127.0.0.1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void trocarIpNaoContornaLimiteDeLoginDaMesmaConta() {
        var service = new LoginRateLimitService();
        for (int indice = 0; indice < 5; indice++) {
            service.verificar("usuario@nexusos.com", "192.0.2." + indice);
            service.registrarFalha("usuario@nexusos.com", "192.0.2." + indice);
        }

        assertThatThrownBy(() -> service.verificar("usuario@nexusos.com", "198.51.100.10"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void trocarIpNaoContornaLimiteDeRecuperacaoDaMesmaConta() {
        var service = new LoginRateLimitService();
        for (int indice = 0; indice < 3; indice++) {
            service.registrarRecuperacao("usuario@nexusos.com", "192.0.2." + indice);
        }

        assertThatThrownBy(() -> service.registrarRecuperacao("usuario@nexusos.com", "198.51.100.10"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }
}
