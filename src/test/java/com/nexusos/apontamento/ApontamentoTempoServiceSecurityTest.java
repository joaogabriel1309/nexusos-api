package com.nexusos.apontamento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.apontamento.dto.ApontamentoTempoRequest;
import com.nexusos.cliente.Cliente;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ApontamentoTempoServiceSecurityTest {

    @Test
    void atribuiApontamentoAoUsuarioAutenticado() {
        var repository = mock(ApontamentoTempoRepository.class);
        var ordemServicoService = mock(OrdemServicoService.class);
        var usuarioService = mock(UsuarioService.class);
        var notificacaoService = mock(NotificacaoService.class);
        var service = new ApontamentoTempoService(repository, ordemServicoService, usuarioService, notificacaoService);
        var ticketId = UUID.randomUUID();
        var usuario = Usuario.builder().id(UUID.randomUUID()).nome("Autor").build();
        var ordem = OrdemServico.builder().id(ticketId).cliente(Cliente.builder().id(UUID.randomUUID()).build()).build();
        when(ordemServicoService.buscarEntidade(ticketId)).thenReturn(ordem);
        when(usuarioService.buscarAutenticado()).thenReturn(usuario);
        when(repository.save(any())).thenAnswer(invocacao -> {
            ApontamentoTempo apontamento = invocacao.getArgument(0);
            apontamento.setId(UUID.randomUUID());
            return apontamento;
        });
        var inicio = OffsetDateTime.now();

        service.criar(ticketId, new ApontamentoTempoRequest("Implementacao", inicio, inicio.plusHours(1)));

        verify(usuarioService).buscarAutenticado();
        verify(notificacaoService).notificarApontamento(ordem, usuario, "novo apontamento registrado");
        assertThat(ApontamentoTempoRequest.class.getRecordComponents()).extracting(component -> component.getName())
                .doesNotContain("usuarioId");
    }
}
