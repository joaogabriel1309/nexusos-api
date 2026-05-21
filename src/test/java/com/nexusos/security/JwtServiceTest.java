package com.nexusos.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.JwtException;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

class JwtServiceTest {

    private static final String SECRET = Base64.getEncoder()
            .encodeToString("0123456789012345678901234567890123456789012345678901234567890123".getBytes());

    @Test
    void deveGerarEValidarTokenAssinado() {
        var service = new JwtService(SECRET, 60, 7);
        var user = new User("admin@nexusos.com", "senha", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        var token = service.gerarAccessToken(user);

        assertThat(service.extrairUsername(token)).isEqualTo("admin@nexusos.com");
        assertThat(service.tokenValido(token, user)).isTrue();
    }

    @Test
    void deveRejeitarTokenMalformado() {
        var service = new JwtService(SECRET, 60, 7);
        var user = new User("admin@nexusos.com", "senha", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        assertThatThrownBy(() -> service.tokenValido("token-invalido", user))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void deveRejeitarSegredoFraco() {
        assertThatThrownBy(() -> new JwtService("segredo-curto", 60, 7))
                .isInstanceOf(IllegalStateException.class);
    }
}
