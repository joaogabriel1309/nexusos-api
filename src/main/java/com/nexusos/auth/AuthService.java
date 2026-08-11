package com.nexusos.auth;

import com.nexusos.auth.dto.LoginRequest;
import com.nexusos.auth.dto.RefreshTokenRequest;
import com.nexusos.auth.dto.TokenResponse;
import com.nexusos.auth.dto.AuthUsuarioResponse;
import com.nexusos.email.EmailService;
import com.nexusos.security.JwtService;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Base64;
import java.util.Locale;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Duration PASSWORD_RESET_VALIDITY = Duration.ofMinutes(60);

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
        var tokenSalvo = refreshTokenRepository.findForUpdateByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Refresh token invalido."));

        var agora = OffsetDateTime.now();
        if (tokenSalvo.getRevogadoEm() != null) {
            refreshTokenRepository.revogarDoUsuario(tokenSalvo.getUsuario(), agora);
            throw new BadCredentialsException("Refresh token expirado ou revogado.");
        }
        if (!tokenSalvo.estaAtivo(agora)) {
            throw new BadCredentialsException("Refresh token expirado ou revogado.");
        }

        org.springframework.security.core.userdetails.UserDetails userDetails;
        try {
            var username = jwtService.extrairUsername(refreshToken);
            userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.refreshTokenValido(refreshToken, userDetails)) {
                tokenSalvo.setRevogadoEm(agora);
                refreshTokenRepository.save(tokenSalvo);
                throw new BadCredentialsException("Refresh token invalido.");
            }
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException ex) {
            tokenSalvo.setRevogadoEm(agora);
            refreshTokenRepository.save(tokenSalvo);
            throw new BadCredentialsException("Refresh token invalido.");
        }

        var novoToken = tokens(userDetails);
        tokenSalvo.setRevogadoEm(agora);
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

    @Transactional
    public void solicitarRecuperacaoSenha(String email) {
        usuarioRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(Usuario::isAtivo)
                .ifPresent(usuario -> {
                    var agora = OffsetDateTime.now();
                    passwordResetTokenRepository.invalidarDoUsuario(usuario, agora);
                    var token = gerarTokenSeguro();
                    passwordResetTokenRepository.save(PasswordResetToken.builder()
                            .usuario(usuario)
                            .tokenHash(hashToken(token))
                            .expiraEm(agora.plus(PASSWORD_RESET_VALIDITY))
                            .build());
                    emailService.enviarRecuperacaoSenha(usuario.getEmail(), token);
                });
    }

    @Transactional
    public void redefinirSenha(String token, String novaSenha) {
        var agora = OffsetDateTime.now();
        var resetToken = passwordResetTokenRepository.findForUpdateByTokenHash(hashToken(token))
                .filter(item -> item.estaAtivo(agora))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Link de recuperacao invalido ou expirado."));
        var usuario = resetToken.getUsuario();
        if (!usuario.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link de recuperacao invalido ou expirado.");
        }
        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);
        passwordResetTokenRepository.invalidarDoUsuario(usuario, agora);
        refreshTokenRepository.revogarDoUsuario(usuario, agora);
    }

    private String gerarTokenSeguro() {
        var bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
