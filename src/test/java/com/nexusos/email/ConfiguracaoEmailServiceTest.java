package com.nexusos.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.email.dto.ConfiguracaoEmailRequest;
import com.nexusos.exception.RegraNegocioException;
import jakarta.validation.Validation;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class ConfiguracaoEmailServiceTest {
    private ConfiguracaoEmailRepository repository;
    private ConfiguracaoEmailService service;

    @BeforeEach
    void configurar() {
        repository = mock(ConfiguracaoEmailRepository.class);
        service = new ConfiguracaoEmailService(repository,
                new SmtpPasswordCipher("chave-de-teste-com-mais-de-trinta-e-dois-caracteres"),
                mock(SmtpSenderFactory.class));
    }

    @Test
    void salvaConfiguracaoCompletaSemExporSenha() {
        var configuracao = vazia();
        when(repository.findById(ConfiguracaoEmail.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        var resposta = service.atualizar(new ConfiguracaoEmailRequest(true, " smtp.exemplo.com ", 587,
                " usuario ", "senha-secreta", " REMETENTE@EXEMPLO.COM "));

        assertThat(resposta.configurado()).isTrue();
        assertThat(resposta.senhaConfigurada()).isTrue();
        assertThat(resposta.emailRemetente()).isEqualTo("remetente@exemplo.com");
        assertThat(configuracao.getSmtpSenhaCifrada()).doesNotContain("senha-secreta");
        verify(repository).save(configuracao);
    }

    @Test
    void mantemSenhaExistenteQuandoNovaSenhaNaoEInformada() {
        var configuracao = vazia();
        configuracao.setSmtpSenhaCifrada("senha-ja-cifrada");
        when(repository.findById(ConfiguracaoEmail.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        service.atualizar(new ConfiguracaoEmailRequest(false, "smtp.exemplo.com", 587,
                "usuario", "  ", "remetente@exemplo.com"));

        assertThat(configuracao.getSmtpSenhaCifrada()).isEqualTo("senha-ja-cifrada");
    }

    @Test
    void rejeitaHabilitacaoIncompletaEEntradaInvalida() {
        when(repository.findById(ConfiguracaoEmail.ID)).thenReturn(Optional.of(vazia()));
        assertThatThrownBy(() -> service.atualizar(new ConfiguracaoEmailRequest(true, null, 587,
                null, null, null))).isInstanceOf(RegraNegocioException.class);

        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var request = new ConfiguracaoEmailRequest(true, "smtp", 70000, "usuario", "senha", "invalido");
            assertThat(factory.getValidator().validate(request)).hasSize(2);
        }
    }

    @Test
    void controllerRestringeTodasAsOperacoesAoAdmin() {
        var autorizacao = ConfiguracaoEmailController.class.getAnnotation(PreAuthorize.class);
        assertThat(autorizacao.value()).isEqualTo("hasRole('ADMIN')");
    }

    private ConfiguracaoEmail vazia() {
        return new ConfiguracaoEmail(ConfiguracaoEmail.ID, false, null, null, null, null, null,
                OffsetDateTime.now());
    }
}
