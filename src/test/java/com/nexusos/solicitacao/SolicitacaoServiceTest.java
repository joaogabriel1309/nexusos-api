package com.nexusos.solicitacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.cliente.Cliente;
import com.nexusos.cliente.ClienteService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.ordemservico.dto.OrdemServicoRequest;
import com.nexusos.ordemservico.dto.OrdemServicoResponse;
import com.nexusos.solicitacao.dto.SolicitacaoConversaoRequest;
import com.nexusos.solicitacao.dto.SolicitacaoRejeicaoRequest;
import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SolicitacaoServiceTest {
    @Mock SolicitacaoRepository repository;
    @Mock InteracaoSolicitacaoRepository interacaoRepository;
    @Mock ClienteService clienteService;
    @Mock UsuarioService usuarioService;
    @Mock SolicitacaoAnexoService anexoService;
    @Mock SolicitacaoAuditoriaService auditoriaService;
    @Mock OrdemServicoService ordemServicoService;
    @Mock NotificacaoService notificacaoService;
    @InjectMocks SolicitacaoService service;

    @BeforeEach
    void prepararRespostasDeDetalhe() {
        lenient().when(interacaoRepository.findBySolicitacaoIdOrderByCriadoEmAsc(any())).thenReturn(List.of());
        lenient().when(anexoService.listar(any())).thenReturn(List.of());
        lenient().when(interacaoRepository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));
        lenient().when(repository.save(any())).thenAnswer(invocacao -> {
            var solicitacao = invocacao.getArgument(0, Solicitacao.class);
            if (solicitacao.getId() == null) solicitacao.prePersist();
            return solicitacao;
        });
    }

    @Test
    void clienteCriaSolicitacaoComProtocoloEEquipeEhNotificada() {
        var cliente = cliente("Cliente A");
        when(clienteService.buscarPorTokenAcesso("token")).thenReturn(cliente);
        when(repository.proximoCodigo()).thenReturn(12L);

        var resposta = service.criarPortal("token", "Novo recurso", "Preciso de um novo recurso",
                PrioridadeOS.ALTA, List.of());

        assertThat(resposta.solicitacao().codigo()).isEqualTo(12L);
        assertThat(resposta.solicitacao().status()).isEqualTo(StatusSolicitacao.NOVA);
        assertThat(resposta.solicitacao().prioridade()).isEqualTo(PrioridadeOS.ALTA);
        verify(anexoService).salvarTodos(any(Solicitacao.class), eq(null), eq(List.of()), eq(true));
        verify(notificacaoService).notificarSolicitacaoNova(any(Solicitacao.class));
    }

    @Test
    void respostaDoClienteRetornaSolicitacaoParaAnalise() {
        var cliente = cliente("Cliente A");
        var solicitacao = solicitacao(cliente, StatusSolicitacao.AGUARDANDO_CLIENTE);
        when(clienteService.buscarPorTokenAcesso("token")).thenReturn(cliente);
        when(repository.buscarParaAtualizacao(solicitacao.getId())).thenReturn(Optional.of(solicitacao));

        service.responderPortal("token", solicitacao.getId(), "Seguem os detalhes.", List.of());

        assertThat(solicitacao.getStatus()).isEqualTo(StatusSolicitacao.EM_ANALISE);
        verify(auditoriaService).registrar(eq(solicitacao), eq(null), eq(OrigemSolicitacao.CLIENTE),
                eq("RESPOSTA_CLIENTE"), any(), eq(StatusSolicitacao.AGUARDANDO_CLIENTE),
                eq(StatusSolicitacao.EM_ANALISE));
        verify(notificacaoService).notificarRespostaSolicitacao(solicitacao);
    }

    @Test
    void rejeicaoPreservaMotivoEEncerraFluxo() {
        var solicitacao = solicitacao(cliente("Cliente A"), StatusSolicitacao.EM_ANALISE);
        var admin = Usuario.builder().id(UUID.randomUUID()).nome("Admin").perfil(PerfilUsuario.ADMIN).build();
        when(repository.buscarParaAtualizacao(solicitacao.getId())).thenReturn(Optional.of(solicitacao));
        when(usuarioService.buscarAutenticado()).thenReturn(admin);

        service.rejeitar(solicitacao.getId(), new SolicitacaoRejeicaoRequest(
                MotivoRejeicaoSolicitacao.FORA_ESCOPO, "Nao faz parte do contrato."));

        assertThat(solicitacao.getStatus()).isEqualTo(StatusSolicitacao.REJEITADA);
        assertThat(solicitacao.getMotivoRejeicao()).isEqualTo(MotivoRejeicaoSolicitacao.FORA_ESCOPO);
        assertThat(solicitacao.getDetalheRejeicao()).isEqualTo("Nao faz parte do contrato.");
    }

    @Test
    void conversaoCriaUmTicketECopiaAnexos() {
        var cliente = cliente("Cliente A");
        var solicitacao = solicitacao(cliente, StatusSolicitacao.EM_ANALISE);
        var admin = Usuario.builder().id(UUID.randomUUID()).nome("Admin").perfil(PerfilUsuario.ADMIN).build();
        solicitacao.setResponsavel(admin);
        var ticket = OrdemServico.builder().id(UUID.randomUUID()).codigo(45L).titulo("Ticket")
                .descricao("Descricao").cliente(cliente).status(StatusOS.RECEBIDA)
                .prioridade(PrioridadeOS.MEDIA).build();
        var ticketResponse = OrdemServicoResponse.from(ticket);
        when(repository.buscarParaAtualizacao(solicitacao.getId())).thenReturn(Optional.of(solicitacao));
        when(usuarioService.buscarAutenticado()).thenReturn(admin);
        when(ordemServicoService.criar(any(OrdemServicoRequest.class))).thenReturn(ticketResponse);
        when(ordemServicoService.buscarEntidade(ticket.getId())).thenReturn(ticket);

        var resposta = service.converter(solicitacao.getId(), new SolicitacaoConversaoRequest(
                "Ticket", "Descricao", null, null, PrioridadeOS.MEDIA, null, false));

        assertThat(resposta.solicitacao().status()).isEqualTo(StatusSolicitacao.CONVERTIDA_EM_TICKET);
        assertThat(resposta.solicitacao().ticketCodigo()).isEqualTo(45L);
        verify(ordemServicoService).criar(argThat(request -> request.responsavelId() == null));
        verify(anexoService).copiarParaTicket(solicitacao.getId(), ticket.getId());
    }

    @Test
    void conversaoRepetidaRetornaMesmoTicketSemCriarOutro() {
        var cliente = cliente("Cliente A");
        var ticket = OrdemServico.builder().id(UUID.randomUUID()).codigo(45L).cliente(cliente).build();
        var solicitacao = solicitacao(cliente, StatusSolicitacao.CONVERTIDA_EM_TICKET);
        solicitacao.setOrdemServico(ticket);
        when(repository.buscarParaAtualizacao(solicitacao.getId())).thenReturn(Optional.of(solicitacao));

        var resposta = service.converter(solicitacao.getId(), new SolicitacaoConversaoRequest(
                "Ticket", "Descricao", null, null, PrioridadeOS.MEDIA, null, false));

        assertThat(resposta.solicitacao().ticketCodigo()).isEqualTo(45L);
        verify(ordemServicoService, never()).criar(any());
    }

    @Test
    void tokenDeOutroClienteNaoAcessaSolicitacao() {
        var dono = cliente("Cliente A");
        var visitante = cliente("Cliente B");
        var solicitacao = solicitacao(dono, StatusSolicitacao.EM_ANALISE);
        when(clienteService.buscarPorTokenAcesso("outro-token")).thenReturn(visitante);
        when(repository.buscarParaAtualizacao(solicitacao.getId())).thenReturn(Optional.of(solicitacao));

        assertThatThrownBy(() -> service.responderPortal(
                "outro-token", solicitacao.getId(), "Tentativa", List.of()))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    private Cliente cliente(String nome) {
        return Cliente.builder().id(UUID.randomUUID()).nome(nome).build();
    }

    private Solicitacao solicitacao(Cliente cliente, StatusSolicitacao status) {
        return Solicitacao.builder().id(UUID.randomUUID()).codigo(10L).titulo("Solicitacao")
                .descricao("Descricao").cliente(cliente).status(status)
                .criadoEm(OffsetDateTime.now().minusDays(1)).atualizadoEm(OffsetDateTime.now()).build();
    }
}
