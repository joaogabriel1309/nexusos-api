package com.nexusos.ordemservico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.cliente.Cliente;
import com.nexusos.cliente.ClienteService;
import com.nexusos.email.EmailService;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import com.nexusos.ordemservico.dto.CancelamentoOrdemServicoRequest;
import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.ordemservico.dto.ReaberturaOrdemServicoRequest;
import com.nexusos.ordemservico.dto.StatusUpdateRequest;
import com.nexusos.ordemservico.dto.SequenciaUpdateRequest;
import com.nexusos.ordemservico.dto.OrdemServicoResponse;
import com.nexusos.ordemservico.dto.VinculosUpdateRequest;
import com.nexusos.projeto.ProjetoService;
import com.nexusos.usuario.UsuarioService;
import com.nexusos.whatsapp.WhatsappService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class OrdemServicoServiceTest {

    @Mock OrdemServicoRepository ordemServicoRepository;
    @Mock ClienteService clienteService;
    @Mock ProjetoService projetoService;
    @Mock UsuarioService usuarioService;
    @Mock AuditoriaService auditoriaService;
    @Mock EmailService emailService;
    @Mock WhatsappService whatsappService;
    @Mock NotificacaoService notificacaoService;
    @Mock SlaPrioridadeService slaPrioridadeService;
    @InjectMocks OrdemServicoService ordemServicoService;

    @AfterEach
    void limparContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void centralClassificaPendenciasEIgnoraPrazoDeOrdemEncerrada() {
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var hoje = LocalDate.now();
        var vencidaSemResponsavel = OrdemServico.builder().id(UUID.randomUUID()).codigo(1L)
                .titulo("Vencida").descricao("Descricao").cliente(cliente).status(StatusOS.EM_ANALISE)
                .prazo(hoje.minusDays(1)).paga(false).build();
        var venceHoje = OrdemServico.builder().id(UUID.randomUUID()).codigo(2L)
                .titulo("Hoje").descricao("Descricao").cliente(cliente).status(StatusOS.RECEBIDA)
                .prazo(hoje).paga(false).build();
        var aguardaCliente = OrdemServico.builder().id(UUID.randomUUID()).codigo(3L)
                .titulo("Cliente").descricao("Descricao").cliente(cliente).status(StatusOS.AGUARDANDO_APROVACAO)
                .paga(false).build();
        var pagamento = OrdemServico.builder().id(UUID.randomUUID()).codigo(4L)
                .titulo("Pagamento").descricao("Descricao").cliente(cliente).status(StatusOS.AGUARDANDO_PAGAMENTO)
                .paga(false).build();
        var reprovada = OrdemServico.builder().id(UUID.randomUUID()).codigo(5L)
                .titulo("Reprovada").descricao("Descricao").cliente(cliente).status(StatusOS.EM_ANALISE)
                .aprovadaPeloCliente(false).paga(false).build();
        var finalizadaVencida = OrdemServico.builder().id(UUID.randomUUID()).codigo(6L)
                .titulo("Finalizada").descricao("Descricao").cliente(cliente).status(StatusOS.FINALIZADA)
                .prazo(hoje.minusDays(2)).paga(true).build();
        when(ordemServicoRepository.buscarParaCentralPendencias()).thenReturn(List.of(
                vencidaSemResponsavel, venceHoje, aguardaCliente, pagamento, reprovada, finalizadaVencida));

        var central = ordemServicoService.listarPendencias();

        assertThat(central.vencidas()).extracting(OrdemServicoResponse::codigo).containsExactly(1L);
        assertThat(central.vencemHoje()).extracting(OrdemServicoResponse::codigo).containsExactly(2L);
        assertThat(central.aguardandoAprovacaoAdmin()).extracting(OrdemServicoResponse::codigo).containsExactly(2L);
        assertThat(central.aguardandoCliente()).extracting(OrdemServicoResponse::codigo).containsExactly(3L);
        assertThat(central.aguardandoPagamento()).extracting(OrdemServicoResponse::codigo).containsExactly(4L);
        assertThat(central.reprovadasPeloCliente()).extracting(OrdemServicoResponse::codigo).containsExactly(5L);
        assertThat(central.semResponsavel()).extracting(OrdemServicoResponse::codigo)
                .containsExactly(1L, 2L, 3L, 4L, 5L);
    }

    @Test
    void adminCancelaOsComMotivoEAuditoria() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var id = UUID.randomUUID();
        var administrador = com.nexusos.usuario.Usuario.builder().id(UUID.randomUUID()).build();
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var ordem = OrdemServico.builder().id(id).codigo(22L).status(StatusOS.EM_DESENVOLVIMENTO)
                .cliente(cliente).sequenciaExecucao(3L).build();
        when(ordemServicoRepository.findById(id)).thenReturn(Optional.of(ordem));
        when(usuarioService.buscarAutenticado()).thenReturn(administrador);
        when(ordemServicoRepository.save(ordem)).thenReturn(ordem);

        ordemServicoService.cancelar(id, new CancelamentoOrdemServicoRequest("  Nao sera mais necessaria  "));

        assertThat(ordem.getStatus()).isEqualTo(StatusOS.CANCELADA);
        assertThat(ordem.getSequenciaExecucao()).isNull();
        verify(auditoriaService).registrar(ordem, administrador, "CANCELAMENTO",
                "OS cancelada. Motivo: Nao sera mais necessaria", StatusOS.EM_DESENVOLVIMENTO, StatusOS.CANCELADA);
        verify(notificacaoService).notificarStatus(ordem);
    }

    @Test
    void rejeitaCancelamentoDeOsFinalizada() {
        var id = UUID.randomUUID();
        var ordem = OrdemServico.builder().id(id).status(StatusOS.FINALIZADA).build();
        when(ordemServicoRepository.findById(id)).thenReturn(Optional.of(ordem));

        assertThatThrownBy(() -> ordemServicoService.cancelar(id, new CancelamentoOrdemServicoRequest("Motivo")))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("finalizada");
        verify(ordemServicoRepository, never()).save(ordem);
    }

    @Test
    void adminReabreOsFinalizadaPreservandoDadosDaFinalizacao() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var id = UUID.randomUUID();
        var administrador = com.nexusos.usuario.Usuario.builder().id(UUID.randomUUID()).build();
        var finalizadoEm = java.time.OffsetDateTime.now().minusDays(1);
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var ordem = OrdemServico.builder().id(id).codigo(21L).status(StatusOS.FINALIZADA)
                .cliente(cliente).finalizadoEm(finalizadoEm).descricaoFinalizacao("Entrega anterior").build();
        when(ordemServicoRepository.findById(id)).thenReturn(Optional.of(ordem));
        when(usuarioService.buscarAutenticado()).thenReturn(administrador);
        when(ordemServicoRepository.save(ordem)).thenReturn(ordem);

        ordemServicoService.reabrir(id, new ReaberturaOrdemServicoRequest("Correcao solicitada"));

        assertThat(ordem.getStatus()).isEqualTo(StatusOS.EM_DESENVOLVIMENTO);
        assertThat(ordem.getFinalizadoEm()).isEqualTo(finalizadoEm);
        assertThat(ordem.getDescricaoFinalizacao()).isEqualTo("Entrega anterior");
        verify(auditoriaService).registrar(ordem, administrador, "REABERTURA",
                "OS reaberta. Motivo: Correcao solicitada", StatusOS.FINALIZADA, StatusOS.EM_DESENVOLVIMENTO);
        verify(notificacaoService).notificarReabertura(ordem, "Correcao solicitada");
    }

    @Test
    void rejeitaReaberturaDeOsNaoFinalizada() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var id = UUID.randomUUID();
        var ordem = OrdemServico.builder().id(id).status(StatusOS.EM_TESTE).build();
        when(ordemServicoRepository.findById(id)).thenReturn(Optional.of(ordem));

        assertThatThrownBy(() -> ordemServicoService.reabrir(id, new ReaberturaOrdemServicoRequest("Motivo")))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("finalizada");
        verify(ordemServicoRepository, never()).save(ordem);
    }

    @Test
    void desenvolvedorListaSomenteSuaFila() {
        autenticar("dev@nexusos.com", "ROLE_DESENVOLVEDOR");
        when(ordemServicoRepository.findByResponsavelEmailOrderByAtualizadoEmDesc("dev@nexusos.com"))
                .thenReturn(List.of());

        assertThat(ordemServicoService.listar()).isEmpty();

        verify(ordemServicoRepository).findByResponsavelEmailOrderByAtualizadoEmDesc("dev@nexusos.com");
    }

    @Test
    void adminListaTodasAsFilas() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        when(ordemServicoRepository.findAllByOrderByAtualizadoEmDesc()).thenReturn(List.of());

        assertThat(ordemServicoService.listar()).isEmpty();

        verify(ordemServicoRepository).findAllByOrderByAtualizadoEmDesc();
    }

    @Test
    void atualizaPrioridadeERecalculaPrazoAusente() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var id = UUID.randomUUID();
        var prazo = LocalDate.now().plusDays(1);
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var ordem = OrdemServico.builder()
                .id(id)
                .codigo(10L)
                .titulo("OS")
                .descricao("Descricao")
                .cliente(cliente)
                .status(StatusOS.RECEBIDA)
                .prioridade(PrioridadeOS.BAIXA)
                .build();
        when(ordemServicoRepository.findById(id)).thenReturn(Optional.of(ordem));
        when(slaPrioridadeService.calcularPrazo(PrioridadeOS.CRITICA)).thenReturn(prazo);
        when(ordemServicoRepository.save(ordem)).thenReturn(ordem);

        var resposta = ordemServicoService.atualizarPrioridade(id, new PrioridadeUpdateRequest(PrioridadeOS.CRITICA));

        assertThat(resposta.prioridade()).isEqualTo(PrioridadeOS.CRITICA);
        assertThat(resposta.prazo()).isEqualTo(prazo);
        verify(notificacaoService).notificarPrioridadeAlterada(ordem);
    }

    @Test
    void desenvolvedorInformaSomenteHorasEPreservaDadosComerciais() {
        autenticar("dev@nexusos.com", "ROLE_DESENVOLVEDOR");
        var id = UUID.randomUUID();
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").valorHora(new BigDecimal("100")).build();
        var ordem = OrdemServico.builder()
                .id(id).codigo(11L).titulo("OS").descricao("Descricao").cliente(cliente)
                .status(StatusOS.EM_ANALISE).prioridade(PrioridadeOS.MEDIA)
                .entendimento("Texto existente").cobrar(Boolean.FALSE).valorTotalEstimado(BigDecimal.ZERO)
                .build();
        when(ordemServicoRepository.findByIdAndResponsavelEmail(id, "dev@nexusos.com")).thenReturn(Optional.of(ordem));
        when(ordemServicoRepository.save(ordem)).thenReturn(ordem);

        var resposta = ordemServicoService.atualizarAnalise(id,
                new AnaliseUpdateRequest("Texto indevido", "Impacto", "Riscos", new BigDecimal("3.5"), true));

        assertThat(resposta.estimativaHoras()).isEqualByComparingTo("3.5");
        assertThat(resposta.entendimento()).isEqualTo("Texto existente");
        assertThat(resposta.cobrar()).isFalse();
        verify(emailService, never()).enviarOrdemServicoAnalisada(ordem);
        verify(whatsappService, never()).enviarOrdemServicoAnalisada(ordem);
    }

    @Test
    void desenvolvedorNaoAvancaAnaliseSemAprovacaoDoAdmin() {
        autenticar("dev@nexusos.com", "ROLE_DESENVOLVEDOR");
        var id = UUID.randomUUID();
        var ordem = OrdemServico.builder().id(id).status(StatusOS.EM_ANALISE).build();
        when(ordemServicoRepository.findByIdAndResponsavelEmail(id, "dev@nexusos.com")).thenReturn(Optional.of(ordem));

        assertThatThrownBy(() -> ordemServicoService.atualizarStatus(id,
                new StatusUpdateRequest(StatusOS.AGUARDANDO_APROVACAO, null, null, null, null, null)))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("administrador");

        verify(ordemServicoRepository, never()).save(ordem);
    }

    @Test
    void adminMoveOsNaFilaSemAlterarStatusOuPrioridade() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var responsavel = com.nexusos.usuario.Usuario.builder().id(UUID.randomUUID()).build();
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var primeira = criarOrdemFila(1L, 1L, responsavel, cliente);
        var segunda = criarOrdemFila(2L, 2L, responsavel, cliente);
        var terceira = criarOrdemFila(3L, 3L, responsavel, cliente);
        when(ordemServicoRepository.findById(terceira.getId())).thenReturn(Optional.of(terceira));
        when(ordemServicoRepository.findFilaByResponsavelId(responsavel.getId(), StatusOS.FINALIZADA))
                .thenReturn(new java.util.ArrayList<>(List.of(primeira, segunda, terceira)));

        var resposta = ordemServicoService.atualizarSequencia(terceira.getId(), new SequenciaUpdateRequest(1));

        assertThat(resposta).extracting(OrdemServicoResponse::codigo).containsExactly(3L, 1L, 2L);
        assertThat(terceira.getStatus()).isEqualTo(StatusOS.RECEBIDA);
        assertThat(terceira.getPrioridade()).isEqualTo(PrioridadeOS.MEDIA);
        verify(ordemServicoRepository).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void rejeitaPosicaoForaDaFila() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var responsavel = com.nexusos.usuario.Usuario.builder().id(UUID.randomUUID()).build();
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var ordem = criarOrdemFila(1L, 1L, responsavel, cliente);
        when(ordemServicoRepository.findById(ordem.getId())).thenReturn(Optional.of(ordem));
        when(ordemServicoRepository.findFilaByResponsavelId(responsavel.getId(), StatusOS.FINALIZADA))
                .thenReturn(new java.util.ArrayList<>(List.of(ordem)));

        assertThatThrownBy(() -> ordemServicoService.atualizarSequencia(ordem.getId(), new SequenciaUpdateRequest(2)))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("entre 1 e 1");
    }

    @Test
    void adminAtualizaVinculosNosDoisSentidos() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build();
        var principal = criarOrdemFila(1L, 1L, null, cliente);
        var vinculada = criarOrdemFila(2L, 2L, null, cliente);
        when(ordemServicoRepository.findById(principal.getId())).thenReturn(Optional.of(principal));
        when(ordemServicoRepository.findAllById(Set.of(vinculada.getId()))).thenReturn(List.of(vinculada));
        when(ordemServicoRepository.save(principal)).thenReturn(principal);
        when(ordemServicoRepository.save(vinculada)).thenReturn(vinculada);

        var resposta = ordemServicoService.atualizarVinculos(
                principal.getId(), new VinculosUpdateRequest(Set.of(vinculada.getId())));

        assertThat(principal.getOrdensVinculadas()).containsExactly(vinculada);
        assertThat(vinculada.getOrdensVinculadas()).containsExactly(principal);
        assertThat(resposta.ordensVinculadas()).extracting(item -> item.codigo()).containsExactly(2L);
        verify(auditoriaService).registrar(principal, null, "VINCULOS",
                "Vinculos entre ordens de servico atualizados.", null, principal.getStatus());
    }

    @Test
    void rejeitaAutorrelacionamento() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var id = UUID.randomUUID();
        var ordem = OrdemServico.builder().id(id).build();
        when(ordemServicoRepository.findById(id)).thenReturn(Optional.of(ordem));

        assertThatThrownBy(() -> ordemServicoService.atualizarVinculos(id, new VinculosUpdateRequest(Set.of(id))))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("ela mesma");

        verify(ordemServicoRepository, never()).findAllById(org.mockito.ArgumentMatchers.any());
    }

    private OrdemServico criarOrdemFila(long codigo, long sequencia, com.nexusos.usuario.Usuario responsavel,
            Cliente cliente) {
        return OrdemServico.builder()
                .id(UUID.randomUUID()).codigo(codigo).titulo("OS " + codigo).descricao("Descricao")
                .cliente(cliente).responsavel(responsavel).status(StatusOS.RECEBIDA)
                .prioridade(PrioridadeOS.MEDIA).sequenciaExecucao(sequencia).build();
    }

    private void autenticar(String email, String role) {
        var authentication = new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
