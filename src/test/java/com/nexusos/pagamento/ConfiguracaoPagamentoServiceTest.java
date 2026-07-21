package com.nexusos.pagamento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.pagamento.dto.ConfiguracaoPagamentoRequest;
import jakarta.validation.Validation;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class ConfiguracaoPagamentoServiceTest {
    private ConfiguracaoPagamentoRepository repository;
    private ConfiguracaoPagamentoService service;

    @BeforeEach
    void configurar() {
        repository = mock(ConfiguracaoPagamentoRepository.class);
        service = new ConfiguracaoPagamentoService(repository,
                new PagamentoCredentialCipher("chave-de-teste-com-mais-de-trinta-e-dois-caracteres"));
    }

    @Test
    void cifraTokenENaoOExpoeNaResposta() {
        var configuracao = configuracao();
        when(repository.findById(ConfiguracaoPagamento.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        var resposta = service.atualizar(new ConfiguracaoPagamentoRequest("token-secreto", "APP_USR-publica",
                60, true, false));

        assertThat(resposta.mercadoPagoTokenConfigurado()).isTrue();
        assertThat(resposta.toString()).doesNotContain("token-secreto");
        assertThat(configuracao.getMercadoPagoTokenCifrado()).doesNotContain("token-secreto");
        assertThat(service.buscarAccessToken()).isEqualTo("token-secreto");
        verify(repository).save(configuracao);
    }

    @Test
    void preservaTokenQuandoAtualizacaoNaoInformaOutro() {
        var configuracao = configuracao();
        configuracao.setMercadoPagoTokenCifrado(new PagamentoCredentialCipher(
                "chave-de-teste-com-mais-de-trinta-e-dois-caracteres").encrypt("existente"));
        var cifrado = configuracao.getMercadoPagoTokenCifrado();
        when(repository.findById(ConfiguracaoPagamento.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        service.atualizar(new ConfiguracaoPagamentoRequest(" ", null, 120, false, true));

        assertThat(configuracao.getMercadoPagoTokenCifrado()).isEqualTo(cifrado);
    }

    @Test
    void validaExpiracaoEProtegeControllerParaAdmin() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(new ConfiguracaoPagamentoRequest(null, null, 4, true, true)))
                    .hasSize(1);
        }
        var permissao = ConfiguracaoPagamentoController.class.getAnnotation(PreAuthorize.class);
        assertThat(permissao.value()).isEqualTo("hasRole('ADMIN')");
    }

    private ConfiguracaoPagamento configuracao() {
        return new ConfiguracaoPagamento(ConfiguracaoPagamento.ID, null, null, 1440, true, true,
                OffsetDateTime.now());
    }
}
