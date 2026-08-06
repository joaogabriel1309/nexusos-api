package com.nexusos.solicitacao;

import static org.assertj.core.api.Assertions.assertThat;

import com.nexusos.portalcliente.PortalSolicitacaoController;
import com.nexusos.solicitacao.dto.SolicitacaoRejeicaoRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class SolicitacaoControllerTest {
    @Test
    void moduloAdministrativoExigePerfilAdmin() {
        assertThat(SolicitacaoController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasRole('ADMIN')");
    }

    @Test
    void portalPermiteAcessoValidadoPeloToken() {
        assertThat(PortalSolicitacaoController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("permitAll()");
    }

    @Test
    void rejeicaoExigeMotivoEDetalhe() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violacoes = factory.getValidator().validate(new SolicitacaoRejeicaoRequest(null, " "));
            assertThat(violacoes).hasSize(2);
        }
    }
}
