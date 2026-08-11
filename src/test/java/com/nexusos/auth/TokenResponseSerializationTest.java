package com.nexusos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusos.auth.dto.AuthUsuarioResponse;
import com.nexusos.auth.dto.TokenResponse;
import com.nexusos.usuario.PerfilUsuario;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TokenResponseSerializationTest {

    @Test
    void naoExpoeTokensNoCorpoJson() throws Exception {
        var response = new TokenResponse(
                "access-token-secreto",
                "refresh-token-secreto",
                "Bearer",
                new AuthUsuarioResponse(UUID.randomUUID(), "Admin", "admin@nexusos.com", PerfilUsuario.ADMIN));

        var json = new ObjectMapper().writeValueAsString(response);

        assertThat(json)
                .doesNotContain("accessToken", "refreshToken", "access-token-secreto", "refresh-token-secreto")
                .contains("\"tokenType\":\"Bearer\"");
    }
}
