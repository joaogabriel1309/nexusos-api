package com.nexusos.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.nexusos.auth.AuthCookieService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

class JwtAuthenticationFilterTest {

    private final JwtService jwtService = new JwtService(
            "nexusos-local-dev-secret-32-bytes-minimum-use-only-dev", 15, 7);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
            jwtService, mock(UserDetailsService.class), new AuthCookieService());

    @AfterEach
    void limparContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void cookieDeSessaoInvalidoNaoBloqueiaRotaPublicaDoPortal() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/portal/clientes/token/ordens-servico");
        request.setServletPath("/api/v1/portal/clientes/token/ordens-servico");
        request.setCookies(new Cookie(AuthCookieService.ACCESS_COOKIE, "token.expirado.invalido"));
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void bearerInvalidoSegueSemAutenticacao() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/ordens-servico");
        request.setServletPath("/api/v1/ordens-servico");
        request.addHeader("Authorization", "Bearer abc");
        var chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
