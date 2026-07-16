package com.nexusos.ordemservico;

import static org.assertj.core.api.Assertions.assertThat;

import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import jakarta.validation.Validation;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class OrdemServicoControllerTest {

    @Test
    void atualizarAnalisePermiteAdminEDesenvolvedor() throws NoSuchMethodException {
        var metodo = OrdemServicoController.class.getMethod(
                "atualizarAnalise",
                UUID.class,
                AnaliseUpdateRequest.class
        );

        assertThat(metodo.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasAnyRole('ADMIN','DESENVOLVEDOR')");
    }

    @Test
    void atualizarPrioridadeExigePerfilAdmin() throws NoSuchMethodException {
        var metodo = OrdemServicoController.class.getMethod(
                "atualizarPrioridade",
                UUID.class,
                PrioridadeUpdateRequest.class
        );

        assertThat(metodo.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void prioridadeNulaEhEntradaInvalida() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violacoes = factory.getValidator().validate(new PrioridadeUpdateRequest(null));

            assertThat(violacoes).hasSize(1);
        }
    }
}
