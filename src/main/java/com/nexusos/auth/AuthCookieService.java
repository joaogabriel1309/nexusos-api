package com.nexusos.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthCookieService {

    public static final String ACCESS_COOKIE = "nexusos_access_token";
    public static final String REFRESH_COOKIE = "nexusos_refresh_token";

    @Value("${nexusos.security.cookies.secure:false}")
    private boolean secure;

    @Value("${nexusos.security.cookies.same-site:Lax}")
    private String sameSite;

    @Value("${nexusos.security.jwt.access-token-expiration-minutes}")
    private long accessExpirationMinutes;

    @Value("${nexusos.security.jwt.refresh-token-expiration-days}")
    private long refreshExpirationDays;

    public void adicionarCookies(HttpHeaders headers, String accessToken, String refreshToken) {
        headers.add(HttpHeaders.SET_COOKIE, criarCookie(ACCESS_COOKIE, accessToken, Duration.ofMinutes(accessExpirationMinutes)).toString());
        headers.add(HttpHeaders.SET_COOKIE, criarCookie(REFRESH_COOKIE, refreshToken, Duration.ofDays(refreshExpirationDays)).toString());
    }

    public void limparCookies(HttpHeaders headers) {
        headers.add(HttpHeaders.SET_COOKIE, criarCookie(ACCESS_COOKIE, "", Duration.ZERO).toString());
        headers.add(HttpHeaders.SET_COOKIE, criarCookie(REFRESH_COOKIE, "", Duration.ZERO).toString());
    }

    public String extrairRefreshToken(HttpServletRequest request) {
        return extrairCookie(request, REFRESH_COOKIE);
    }

    public String extrairAccessToken(HttpServletRequest request) {
        return extrairCookie(request, ACCESS_COOKIE);
    }

    private ResponseCookie criarCookie(String nome, String valor, Duration maxAge) {
        return ResponseCookie.from(nome, valor)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private String extrairCookie(HttpServletRequest request, String nome) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (var cookie : cookies) {
            if (nome.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }
}
