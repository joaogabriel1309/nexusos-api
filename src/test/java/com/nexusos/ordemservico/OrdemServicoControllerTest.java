package com.nexusos.ordemservico;

import static org.assertj.core.api.Assertions.assertThat;

import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import com.nexusos.ordemservico.dto.SequenciaUpdateRequest;
import com.nexusos.ordemservico.dto.ReaberturaOrdemServicoRequest;
import com.nexusos.ordemservico.dto.VinculosUpdateRequest;
import jakarta.validation.Validation;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class OrdemServicoControllerTest {

    @Test
    void reabrirExigePerfilAdmin() throws NoSuchMethodException {
        var metodo = OrdemServicoController.class.getMethod(
                "reabrir", UUID.class, ReaberturaOrdemServicoRequest.class);
        assertThat(metodo.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void motivoDaReaberturaEhObrigatorio() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(new ReaberturaOrdemServicoRequest("  "))).hasSize(1);
        }
    }

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

    @Test
    void atualizarSequenciaExigePerfilAdmin() throws NoSuchMethodException {
        var metodo = OrdemServicoController.class.getMethod(
                "atualizarSequencia",
                UUID.class,
                SequenciaUpdateRequest.class
        );

        assertThat(metodo.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void sequenciaMenorQueUmEhEntradaInvalida() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violacoes = factory.getValidator().validate(new SequenciaUpdateRequest(0));

            assertThat(violacoes).hasSize(1);
        }
    }

    @Test
    void atualizarVinculosExigePerfilAdmin() throws NoSuchMethodException {
        var metodo = OrdemServicoController.class.getMethod(
                "atualizarVinculos", UUID.class, VinculosUpdateRequest.class);

        assertThat(metodo.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void listaDeVinculosNulaEhEntradaInvalida() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violacoes = factory.getValidator().validate(new VinculosUpdateRequest(null));

            assertThat(violacoes).hasSize(1);
        }
    }
}
