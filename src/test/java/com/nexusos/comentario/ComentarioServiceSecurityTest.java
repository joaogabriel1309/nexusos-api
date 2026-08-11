package com.nexusos.comentario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.cliente.Cliente;
import com.nexusos.comentario.dto.ComentarioRequest;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ComentarioServiceSecurityTest {

    @Test
    void atribuiComentarioAoUsuarioAutenticado() {
        var repository = mock(ComentarioRepository.class);
        var ordemServicoService = mock(OrdemServicoService.class);
        var usuarioService = mock(UsuarioService.class);
        var notificacaoService = mock(NotificacaoService.class);
        var service = new ComentarioService(repository, ordemServicoService, usuarioService, notificacaoService);
        var ticketId = UUID.randomUUID();
        var usuario = Usuario.builder().id(UUID.randomUUID()).nome("Autor").build();
        var ordem = OrdemServico.builder().id(ticketId).cliente(Cliente.builder().id(UUID.randomUUID()).build()).build();
        when(ordemServicoService.buscarEntidade(ticketId)).thenReturn(ordem);
        when(usuarioService.buscarAutenticado()).thenReturn(usuario);
        when(repository.save(any())).thenAnswer(invocacao -> {
            Comentario comentario = invocacao.getArgument(0);
            comentario.setId(UUID.randomUUID());
            return comentario;
        });

        service.criar(ticketId, new ComentarioRequest("Mensagem"));

        verify(usuarioService).buscarAutenticado();
        verify(notificacaoService).notificarComentario(ordem, usuario);
        assertThat(ComentarioRequest.class.getRecordComponents()).extracting(component -> component.getName())
                .doesNotContain("usuarioId");
    }
}
