package com.nexusos.auditoria;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.nexusos.ordemservico.OrdemServicoService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuditoriaControllerSecurityTest {

    @Test
    void validaAcessoAoTicketAntesDeConsultarAuditoria() {
        var auditoriaService = mock(AuditoriaService.class);
        var ordemServicoService = mock(OrdemServicoService.class);
        var controller = new AuditoriaController(auditoriaService, ordemServicoService);
        var ticketId = UUID.randomUUID();
        when(auditoriaService.listarPorOrdemServico(ticketId)).thenReturn(List.of());

        controller.listarPorOrdemServico(ticketId);

        var ordem = inOrder(ordemServicoService, auditoriaService);
        ordem.verify(ordemServicoService).buscarEntidade(ticketId);
        ordem.verify(auditoriaService).listarPorOrdemServico(ticketId);
    }
}
