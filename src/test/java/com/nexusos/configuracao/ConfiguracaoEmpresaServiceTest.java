package com.nexusos.configuracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.configuracao.dto.ConfiguracaoEmpresaRequest;
import jakarta.validation.Validation;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class ConfiguracaoEmpresaServiceTest {
    private ConfiguracaoEmpresaRepository repository;
    private ConfiguracaoEmpresaService service;

    @BeforeEach
    void configurar() {
        repository = org.mockito.Mockito.mock(ConfiguracaoEmpresaRepository.class);
        service = new ConfiguracaoEmpresaService(repository);
    }

    @Test
    void atualizaCadastroUnicoNormalizandoValores() {
        var configuracao = new ConfiguracaoEmpresa(ConfiguracaoEmpresa.ID, "NexusOS", null, null, null,
                null, null, "#087EA4", OffsetDateTime.now());
        when(repository.findById(ConfiguracaoEmpresa.ID)).thenReturn(Optional.of(configuracao));
        when(repository.save(configuracao)).thenReturn(configuracao);

        var resposta = service.atualizar(new ConfiguracaoEmpresaRequest(" Empresa ", "", "123.456.789-01",
                " CONTATO@EXEMPLO.COM ", " (65) 99999-0000 ", " Rua A ", "#ab12ef"));

        assertThat(resposta.nome()).isEqualTo("Empresa");
        assertThat(resposta.logo()).isNull();
        assertThat(resposta.email()).isEqualTo("contato@exemplo.com");
        assertThat(resposta.corPrincipal()).isEqualTo("#AB12EF");
        verify(repository).save(configuracao);
    }

    @Test
    void rejeitaEntradaInvalida() {
        try (var validatorFactory = Validation.buildDefaultValidatorFactory()) {
            var request = new ConfiguracaoEmpresaRequest("", "data:text/html;base64,AAA", "123", "invalido",
                    null, null, "azul");
            assertThat(validatorFactory.getValidator().validate(request)).hasSizeGreaterThanOrEqualTo(5);
        }
    }

    @Test
    void controllerPermiteLeituraAutenticadaEMantemEdicaoAdministrativa() throws NoSuchMethodException {
        var leitura = ConfiguracaoEmpresaController.class.getMethod("buscar").getAnnotation(PreAuthorize.class);
        var edicao = ConfiguracaoEmpresaController.class.getMethod("atualizar", ConfiguracaoEmpresaRequest.class)
                .getAnnotation(PreAuthorize.class);
        assertThat(leitura.value()).isEqualTo("hasAnyRole('ADMIN','DESENVOLVEDOR')");
        assertThat(edicao.value()).isEqualTo("hasRole('ADMIN')");
    }
}
