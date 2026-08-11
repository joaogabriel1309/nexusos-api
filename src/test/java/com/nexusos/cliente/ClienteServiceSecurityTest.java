package com.nexusos.cliente;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.notificacao.NotificacaoService;
import org.junit.jupiter.api.Test;

class ClienteServiceSecurityTest {

    @Test
    void rejeitaTokenPublicoMalformadoAntesDeConsultarBanco() {
        var repository = mock(ClienteRepository.class);
        var service = new ClienteService(repository, mock(NotificacaoService.class));

        assertThatThrownBy(() -> service.buscarPorTokenAcesso("token-curto"))
                .isInstanceOf(RecursoNaoEncontradoException.class)
                .hasMessage("Link de acesso invalido.");

        verifyNoInteractions(repository);
    }
}
