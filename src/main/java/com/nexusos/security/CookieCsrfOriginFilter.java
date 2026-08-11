package com.nexusos.security;

import com.nexusos.auth.AuthCookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CookieCsrfOriginFilter extends OncePerRequestFilter {

    private static final Set<String> METODOS_SEGUROS = Set.of(
            HttpMethod.GET.name(), HttpMethod.HEAD.name(), HttpMethod.OPTIONS.name(), HttpMethod.TRACE.name());
    private final AuthCookieService authCookieService;
    private final Set<String> origensPermitidas;

    public CookieCsrfOriginFilter(AuthCookieService authCookieService,
            @Value("${nexusos.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
            List<String> allowedOrigins) {
        this.authCookieService = authCookieService;
        this.origensPermitidas = new HashSet<>();
        allowedOrigins.stream().map(this::normalizarOrigem).forEach(origensPermitidas::add);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!METODOS_SEGUROS.contains(request.getMethod()) && possuiCookieDeAutenticacao(request)
                && !origemPermitida(request)) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "Origem da requisicao nao permitida.");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean possuiCookieDeAutenticacao(HttpServletRequest request) {
        return authCookieService.extrairAccessToken(request) != null
                || authCookieService.extrairRefreshToken(request) != null;
    }

    private boolean origemPermitida(HttpServletRequest request) {
        var origem = request.getHeader("Origin");
        if (origem == null || origem.isBlank()) {
            return false;
        }

        var normalizada = normalizarOrigem(origem);
        if (origensPermitidas.contains(normalizada)) {
            return true;
        }

        var origemDaRequisicao = normalizarOrigem(
                request.getScheme() + "://" + request.getServerName()
                        + portaSeNecessaria(request.getScheme(), request.getServerPort()));
        return normalizada.equals(origemDaRequisicao);
    }

    private String portaSeNecessaria(String esquema, int porta) {
        return ("http".equalsIgnoreCase(esquema) && porta == 80)
                || ("https".equalsIgnoreCase(esquema) && porta == 443) ? "" : ":" + porta;
    }

    private String normalizarOrigem(String valor) {
        try {
            var uri = URI.create(valor.trim());
            if (uri.getScheme() == null || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getPath() != null && !uri.getPath().isBlank() && !"/".equals(uri.getPath())
                    || uri.getQuery() != null || uri.getFragment() != null) {
                return "";
            }
            var esquema = uri.getScheme().toLowerCase(Locale.ROOT);
            var porta = uri.getPort();
            var portaNormalizada = porta < 0 ? "" : portaSeNecessaria(esquema, porta);
            return esquema + "://" + uri.getHost().toLowerCase(Locale.ROOT) + portaNormalizada;
        } catch (IllegalArgumentException ex) {
            return "";
        }
    }
}
