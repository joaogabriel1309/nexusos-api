package com.nexusos.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.exception.RegraNegocioException;
import com.nexusos.whatsapp.dto.ConfiguracaoWhatsappRequest;
import jakarta.validation.Validation;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class ConfiguracaoWhatsappServiceTest {
    private ConfiguracaoWhatsappRepository repository;
    private ConfiguracaoWhatsappService service;

    @BeforeEach
    void configurar() {
        repository = mock(ConfiguracaoWhatsappRepository.class);
        service = new ConfiguracaoWhatsappService(repository,
                new WhatsappCredentialCipher("chave-de-teste-com-mais-de-trinta-e-dois-caracteres"));
    }

    @Test
    void salvaConfiguracaoCompletaSemExporCredencial() {
        var configuracao = vazia();
        when(repository.findById(ConfiguracaoWhatsapp.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        var resposta = service.atualizar(new ConfiguracaoWhatsappRequest(true, WhatsappProvider.META,
                "token-secreto", " +55 11 99999-9999 ", "123456"));

        assertThat(resposta.configurado()).isTrue();
        assertThat(resposta.credencialConfigurada()).isTrue();
        assertThat(configuracao.getCredencialCifrada()).doesNotContain("token-secreto");
        verify(repository).save(configuracao);
    }

    @Test
    void mantemCredencialExistenteQuandoNovaNaoEInformada() {
        var configuracao = vazia();
        configuracao.setCredencialCifrada("credencial-ja-cifrada");
        when(repository.findById(ConfiguracaoWhatsapp.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        service.atualizar(new ConfiguracaoWhatsappRequest(false, WhatsappProvider.CALLMEBOT,
                " ", "5511999999999", null));

        assertThat(configuracao.getCredencialCifrada()).isEqualTo("credencial-ja-cifrada");
    }

    @Test
    void rejeitaHabilitacaoIncompletaEEntradaInvalida() {
        when(repository.findById(ConfiguracaoWhatsapp.ID)).thenReturn(Optional.of(vazia()));
        assertThatThrownBy(() -> service.atualizar(new ConfiguracaoWhatsappRequest(true,
                WhatsappProvider.META, null, null, null))).isInstanceOf(RegraNegocioException.class);

        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var request = new ConfiguracaoWhatsappRequest(true, WhatsappProvider.META,
                    "token", "numero-invalido", "id-invalido");
            assertThat(factory.getValidator().validate(request)).hasSize(2);
        }
    }

    @Test
    void controllerAplicaPermissoesPorOperacao() throws Exception {
        var leitura = ConfiguracaoWhatsappController.class.getMethod("buscar").getAnnotation(PreAuthorize.class);
        var escrita = ConfiguracaoWhatsappController.class
                .getMethod("atualizar", ConfiguracaoWhatsappRequest.class).getAnnotation(PreAuthorize.class);
        var teste = ConfiguracaoWhatsappController.class.getMethod("testar").getAnnotation(PreAuthorize.class);
        assertThat(leitura.value()).isEqualTo("hasAnyRole('ADMIN','DESENVOLVEDOR')");
        assertThat(escrita.value()).isEqualTo("hasRole('ADMIN')");
        assertThat(teste.value()).isEqualTo("hasRole('ADMIN')");
    }

    private ConfiguracaoWhatsapp vazia() {
        return new ConfiguracaoWhatsapp(ConfiguracaoWhatsapp.ID, false, WhatsappProvider.CALLMEBOT,
                null, null, null, OffsetDateTime.now());
    }
}
