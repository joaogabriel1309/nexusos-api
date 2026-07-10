package com.nexusos.auth;

import com.nexusos.auth.dto.LoginRequest;
import com.nexusos.auth.dto.RefreshTokenRequest;
import com.nexusos.auth.dto.TokenResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginRateLimitService loginRateLimitService;
    private final AuthCookieService authCookieService;

    @Operation(summary = "Realiza login e retorna tokens JWT")
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        var ip = extrairIp(httpRequest);
        loginRateLimitService.verificar(request.email(), ip);
        try {
            var response = authService.login(request);
            loginRateLimitService.registrarSucesso(request.email(), ip);
            return responderComCookies(response);
        } catch (BadCredentialsException ex) {
            loginRateLimitService.registrarFalha(request.email(), ip);
            throw ex;
        }
    }

    @Operation(summary = "Atualiza tokens JWT usando refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        var refreshToken = request != null && request.refreshToken() != null
                ? request.refreshToken()
                : authCookieService.extrairRefreshToken(httpRequest);
        return responderComCookies(authService.refresh(new RefreshTokenRequest(refreshToken)));
    }

    @Operation(summary = "Encerra a sessao atual")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(authCookieService.extrairRefreshToken(request));
        var headers = new HttpHeaders();
        authCookieService.limparCookies(headers);
        return ResponseEntity.noContent().headers(headers).build();
    }

    @Operation(summary = "Retorna o usuario autenticado")
    @PostMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        var refreshToken = authCookieService.extrairRefreshToken(request);
        return responderComCookies(authService.refresh(new RefreshTokenRequest(refreshToken)));
    }

    private ResponseEntity<TokenResponse> responderComCookies(TokenResponse response) {
        var headers = new HttpHeaders();
        authCookieService.adicionarCookies(headers, response.accessToken(), response.refreshToken());
        return ResponseEntity.ok().headers(headers).body(response);
    }

    private String extrairIp(HttpServletRequest request) {
        var forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
