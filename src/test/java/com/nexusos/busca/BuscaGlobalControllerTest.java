package com.nexusos.busca;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class BuscaGlobalControllerTest {

    @Test
    void buscaPermiteAdminEDesenvolvedor() throws NoSuchMethodException {
        var metodo = BuscaGlobalController.class.getMethod(
                "buscar", String.class, org.springframework.security.core.Authentication.class);

        assertThat(metodo.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasAnyRole('ADMIN','DESENVOLVEDOR')");
    }

    @Test
    void termoExigeEntreDoisECemCaracteres() throws NoSuchMethodException {
        var metodo = BuscaGlobalController.class.getMethod(
                "buscar", String.class, org.springframework.security.core.Authentication.class);
        var parametro = metodo.getParameters()[0];
        var size = Arrays.stream(parametro.getAnnotations())
                .filter(Size.class::isInstance)
                .map(Size.class::cast)
                .findFirst()
                .orElseThrow();

        assertThat(size.min()).isEqualTo(2);
        assertThat(size.max()).isEqualTo(100);
    }
}
