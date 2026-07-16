package com.nexusos.ordemservico.calendario;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class CalendarioControllerTest {

    @Test
    void consultaPermiteSomentePerfisInternosAutorizados() throws NoSuchMethodException {
        var metodo = CalendarioController.class.getMethod("listar", LocalDate.class, LocalDate.class,
                UUID.class, UUID.class, UUID.class,
                com.nexusos.ordemservico.PrioridadeOS.class, com.nexusos.ordemservico.StatusOS.class);

        assertThat(metodo.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasAnyRole('ADMIN','DESENVOLVEDOR')");
    }
}
