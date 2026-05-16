package com.nexusos.auth;

import com.nexusos.auth.dto.LoginRequest;
import com.nexusos.auth.dto.RefreshTokenRequest;
import com.nexusos.auth.dto.TokenResponse;
import com.nexusos.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;

    public TokenResponse login(LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.senha()));
        var userDetails = userDetailsService.loadUserByUsername(request.email());
        return tokens(userDetails);
    }

    public TokenResponse refresh(RefreshTokenRequest request) {
        var username = jwtService.extrairUsername(request.refreshToken());
        var userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.tokenValido(request.refreshToken(), userDetails)) {
            throw new org.springframework.security.authentication.BadCredentialsException("Refresh token invalido.");
        }
        return tokens(userDetails);
    }

    private TokenResponse tokens(org.springframework.security.core.userdetails.UserDetails userDetails) {
        return new TokenResponse(
                jwtService.gerarAccessToken(userDetails),
                jwtService.gerarRefreshToken(userDetails),
                "Bearer"
        );
    }
}
