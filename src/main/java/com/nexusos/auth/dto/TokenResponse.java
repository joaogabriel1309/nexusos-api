package com.nexusos.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record TokenResponse(
        @JsonIgnore
        String accessToken,
        @JsonIgnore
        String refreshToken,
        String tokenType,
        AuthUsuarioResponse usuario
) {
}
