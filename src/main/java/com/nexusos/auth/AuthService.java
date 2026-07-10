package com.nexusos.auth;

import com.nexusos.auth.dto.LoginRequest;
import com.nexusos.auth.dto.RefreshTokenRequest;
import com.nexusos.auth.dto.TokenResponse;
import com.nexusos.auth.dto.AuthUsuarioResponse;
import com.nexusos.security.JwtService;
import com.nexusos.usuario.Usuario;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public TokenResponse login(LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.senha()));
        var userDetails = userDetailsService.loadUserByUsername(request.email());
        return tokens(userDetails);
    }

    @Transactional
    public TokenResponse refresh(RefreshTokenRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw new BadCredentialsException("Refresh token invalido.");
        }

        var refreshToken = request.refreshToken();
        var tokenHash = hashToken(refreshToken);
        var tokenSalvo = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Refresh token invalido."));

        if (!tokenSalvo.estaAtivo(OffsetDateTime.now())) {
            throw new BadCredentialsException("Refresh token expirado ou revogado.");
        }

        var username = jwtService.extrairUsername(refreshToken);
        var userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.tokenValido(refreshToken, userDetails)) {
            tokenSalvo.setRevogadoEm(OffsetDateTime.now());
            refreshTokenRepository.save(tokenSalvo);
            throw new BadCredentialsException("Refresh token invalido.");
        }

        var novoToken = tokens(userDetails);
        tokenSalvo.setRevogadoEm(OffsetDateTime.now());
        tokenSalvo.setSubstituidoPorHash(hashToken(novoToken.refreshToken()));
        refreshTokenRepository.save(tokenSalvo);
        return novoToken;
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        refreshTokenRepository.findByTokenHash(hashToken(refreshToken))
                .filter(token -> token.getRevogadoEm() == null)
                .ifPresent(token -> {
                    token.setRevogadoEm(OffsetDateTime.now());
                    refreshTokenRepository.save(token);
                });
    }

    private TokenResponse tokens(org.springframework.security.core.userdetails.UserDetails userDetails) {
        var accessToken = jwtService.gerarAccessToken(userDetails);
        var refreshToken = jwtService.gerarRefreshToken(userDetails);
        var usuario = (Usuario) userDetails;

        refreshTokenRepository.save(RefreshToken.builder()
                .usuario(usuario)
                .tokenHash(hashToken(refreshToken))
                .expiraEm(OffsetDateTime.ofInstant(jwtService.extrairExpiracao(refreshToken), ZoneOffset.UTC))
                .build());

        return new TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                AuthUsuarioResponse.from(usuario)
        );
    }

    private String hashToken(String token) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponivel.", ex);
        }
    }
}
