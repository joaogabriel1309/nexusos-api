package com.nexusos.ordemservico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.cliente.Cliente;
import com.nexusos.cliente.ClienteService;
import com.nexusos.email.EmailService;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.projeto.ProjetoService;
import com.nexusos.usuario.UsuarioService;
import com.nexusos.whatsapp.WhatsappService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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

    private void autenticar(String email, String role) {
        var authentication = new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
