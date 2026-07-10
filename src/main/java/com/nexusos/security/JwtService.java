package com.nexusos.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Date;
import javax.crypto.SecretKey;
import com.nexusos.usuario.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessExpirationMinutes;
    private final long refreshExpirationDays;

    public JwtService(
            @Value("${nexusos.security.jwt.secret}") String secret,
            @Value("${nexusos.security.jwt.access-token-expiration-minutes}") long accessExpirationMinutes,
            @Value("${nexusos.security.jwt.refresh-token-expiration-days}") long refreshExpirationDays
    ) {
        this.key = Keys.hmacShaKeyFor(normalizeSecret(secret));
        this.accessExpirationMinutes = accessExpirationMinutes;
        this.refreshExpirationDays = refreshExpirationDays;
    }

    public String gerarAccessToken(UserDetails userDetails) {
        return gerarToken(userDetails, Instant.now().plus(accessExpirationMinutes, ChronoUnit.MINUTES));
    }

    public String gerarRefreshToken(UserDetails userDetails) {
        return gerarToken(userDetails, Instant.now().plus(refreshExpirationDays, ChronoUnit.DAYS));
    }

    public boolean tokenValido(String token, UserDetails userDetails) {
        return extrairUsername(token).equals(userDetails.getUsername()) && !isExpirado(token);
    }

    public String extrairUsername(String token) {
        return extrairClaims(token).getSubject();
    }

    private String gerarToken(UserDetails userDetails, Instant expiresAt) {
        var now = Instant.now();
        var claims = new HashMap<String, Object>();

        if (userDetails instanceof Usuario usuario) {
            claims.put("perfil", usuario.getPerfil().name());
        }

        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }

    private boolean isExpirado(String token) {
        return extrairClaims(token).getExpiration().before(new Date());
    }

    private Claims extrairClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private byte[] normalizeSecret(String secret) {
        if (secret == null || secret.isBlank() || secret.startsWith("change-this-secret")) {
            throw new IllegalStateException("JWT_SECRET deve ser configurado com um segredo forte.");
        }

        byte[] normalized;
        try {
            normalized = Decoders.BASE64.decode(secret);
        } catch (DecodingException ex) {
            normalized = secret.getBytes(StandardCharsets.UTF_8);
        }

        if (normalized.length < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 256 bits.");
        }

        return normalized;
    }
}
