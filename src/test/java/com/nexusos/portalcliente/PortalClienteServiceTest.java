package com.nexusos.portalcliente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.cliente.Cliente;
import com.nexusos.cliente.ClienteService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.pagamento.MercadoPagoService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PortalClienteServiceTest {

    private ClienteService clienteService;
    private OrdemServicoRepository ordemServicoRepository;
    private OrdemServicoService ordemServicoService;
    private PortalClienteService portalClienteService;

    @BeforeEach
    void setUp() {
        clienteService = mock(ClienteService.class);
        ordemServicoRepository = mock(OrdemServicoRepository.class);
        ordemServicoService = mock(OrdemServicoService.class);
        portalClienteService = new PortalClienteService(
                clienteService,
                ordemServicoRepository,
                ordemServicoService,
                mock(MercadoPagoService.class)
        );
    }

    @Test
    void deveRegistrarSolicitacaoDeAjusteComMotivoNormalizado() {
        var clienteId = UUID.randomUUID();
        var ordemId = UUID.randomUUID();
        var cliente = Cliente.builder().id(clienteId).build();
        var ordem = OrdemServico.builder()
                .id(ordemId)
                .cliente(cliente)
                .status(StatusOS.AGUARDANDO_APROVACAO)
                .build();
        when(clienteService.buscarPorTokenAcesso("token-valido")).thenReturn(cliente);
        when(ordemServicoRepository.findById(ordemId)).thenReturn(Optional.of(ordem));

        portalClienteService.reprovar("token-valido", ordemId, "  Ajustar o prazo informado.  ");

        verify(ordemServicoService).registrarAprovacaoCliente(ordemId, false, "Ajustar o prazo informado.");
    }

    @Test
    void deveRecusarSolicitacaoDeAjusteSemMotivo() {
        assertThatThrownBy(() -> portalClienteService.reprovar("token-valido", UUID.randomUUID(), "   "))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Informe o motivo da solicitacao de ajuste.");

        verify(clienteService, never()).buscarPorTokenAcesso("token-valido");
    }

    @Test
    void naoDevePermitirDecisaoEmOrdemDeOutroCliente() {
        var cliente = Cliente.builder().id(UUID.randomUUID()).build();
        var ordemId = UUID.randomUUID();
        var ordemDeOutroCliente = OrdemServico.builder()
                .id(ordemId)
                .cliente(Cliente.builder().id(UUID.randomUUID()).build())
                .build();
        when(clienteService.buscarPorTokenAcesso("token-valido")).thenReturn(cliente);
        when(ordemServicoRepository.findById(ordemId)).thenReturn(Optional.of(ordemDeOutroCliente));

        assertThatThrownBy(() -> portalClienteService.reprovar("token-valido", ordemId, "Motivo valido"))
                .isInstanceOf(RecursoNaoEncontradoException.class);

        verify(ordemServicoService, never()).registrarAprovacaoCliente(ordemId, false, "Motivo valido");
    }

    @Test
    void naoDeveAutorizarAcessoAAnexosDeOrdemDeOutroCliente() {
        var cliente = Cliente.builder().id(UUID.randomUUID()).build();
        var ordemId = UUID.randomUUID();
        var ordemDeOutroCliente = OrdemServico.builder()
                .id(ordemId)
                .cliente(Cliente.builder().id(UUID.randomUUID()).build())
                .build();
        when(clienteService.buscarPorTokenAcesso("token-valido")).thenReturn(cliente);
        when(ordemServicoRepository.findById(ordemId)).thenReturn(Optional.of(ordemDeOutroCliente));

        assertThatThrownBy(() -> portalClienteService.validarAcesso("token-valido", ordemId))
                .isInstanceOf(RecursoNaoEncontradoException.class)
                .hasMessage("Ticket não encontrado para este cliente.");
    }

    @Test
    void deveAutorizarAcessoDoClienteAAnexosDaPropriaOrdem() {
        var cliente = Cliente.builder().id(UUID.randomUUID()).build();
        var ordemId = UUID.randomUUID();
        var ordem = OrdemServico.builder().id(ordemId).cliente(cliente).build();
        when(clienteService.buscarPorTokenAcesso("token-valido")).thenReturn(cliente);
        when(ordemServicoRepository.findById(ordemId)).thenReturn(Optional.of(ordem));

        assertThat(portalClienteService.validarAcesso("token-valido", ordemId)).isSameAs(ordem);
    }
}
