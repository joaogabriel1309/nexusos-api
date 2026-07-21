package com.nexusos.ordemservico;
import static org.assertj.core.api.Assertions.assertThat;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
class OrdemServicoIAControllerTest {
    @Test void analisePermiteAdminEDesenvolvedor() throws Exception {
        var metodo = OrdemServicoController.class.getMethod("analisarComIA", UUID.class);
        assertThat(metodo.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasAnyRole('ADMIN','DESENVOLVEDOR')");
    }
}
