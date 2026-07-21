package com.nexusos.configuracao;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.nexusos.configuracao.dto.ConfiguracaoIARequest;
import com.nexusos.exception.RegraNegocioException;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.security.access.prepost.PreAuthorize;

class ConfiguracaoIAServiceTest {
    private ConfiguracaoIARepository repository; private ConfiguracaoIAService service;
    @BeforeEach void setup() { repository = mock(ConfiguracaoIARepository.class); service = new ConfiguracaoIAService(repository, new IACredentialCipher("chave-de-teste-ia-com-mais-de-trinta-e-dois-caracteres")); }
    @Test void salvaChaveCifradaSemExporSegredo() {
        var c = vazia(); when(repository.findById(ConfiguracaoIA.ID)).thenReturn(Optional.of(c)); when(repository.save(c)).thenReturn(c);
        var resposta = service.atualizar(new ConfiguracaoIARequest(true, "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", "segredo-openai", new BigDecimal("0.20")));
        assertThat(resposta.chaveConfigurada()).isTrue(); assertThat(resposta.toString()).doesNotContain("segredo-openai");
        assertThat(c.getApiKeyCriptografada()).doesNotContain("segredo-openai"); assertThat(service.chave(c)).isEqualTo("segredo-openai");
    }
    @Test void rejeitaHabilitacaoSemChave() {
        when(repository.findById(ConfiguracaoIA.ID)).thenReturn(Optional.of(vazia()));
        assertThatThrownBy(() -> service.atualizar(new ConfiguracaoIARequest(true, "https://api.openai.com/v1/chat/completions", "modelo", null, BigDecimal.ZERO))).isInstanceOf(RegraNegocioException.class);
    }
    @Test void validaEndpointOficialETemperatura() {
        try (var f = Validation.buildDefaultValidatorFactory()) {
            var invalida = new ConfiguracaoIARequest(false, "https://malicioso.example/api", "", null, new BigDecimal("2.1"));
            assertThat(f.getValidator().validate(invalida)).hasSize(3);
        }
    }
    @Test void configuracaoEhExclusivaDoAdmin() { assertThat(ConfiguracaoIAController.class.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')"); }
    private ConfiguracaoIA vazia() { var c = new ConfiguracaoIA(); c.setId(ConfiguracaoIA.ID); c.setApiUrl("https://api.openai.com/v1/chat/completions"); c.setModelo("gpt-4o-mini"); c.setTemperatura(new BigDecimal("0.2")); c.setAtualizadoEm(OffsetDateTime.now()); return c; }
}
