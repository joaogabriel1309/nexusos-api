package com.nexusos.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.nexusos.auth.AuthCookieService;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CookieCsrfOriginFilterTest {

    @Test
    void rejeitaOrigemExternaQuandoAutenticacaoUsaCookie() throws Exception {
        var filter = new CookieCsrfOriginFilter(new AuthCookieService(), List.of("https://nexusosapp.com.br"));
        var request = requisicao("https://site-malicioso.example");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void permiteOrigemConfiguradaQuandoAutenticacaoUsaCookie() throws Exception {
        var filter = new CookieCsrfOriginFilter(new AuthCookieService(), List.of("https://nexusosapp.com.br"));
        var request = requisicao("https://nexusosapp.com.br");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }

    private MockHttpServletRequest requisicao(String origem) {
        var request = new MockHttpServletRequest("PATCH", "/api/v1/ordens-servico/1/status");
        request.setServerName("api.nexusosapp.com.br");
        request.setServerPort(443);
        request.setScheme("https");
        request.addHeader("Origin", origem);
        request.setCookies(new Cookie(AuthCookieService.ACCESS_COOKIE, "token"));
        return request;
    }
}
