package com.nexusos.ordemservico.calendario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.cliente.Cliente;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
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
class CalendarioServiceTest {

    @Mock OrdemServicoRepository ordemServicoRepository;
    @InjectMocks CalendarioService calendarioService;

    @AfterEach
    void limparContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void classificaEntregaVencimentoEFinalizacao() {
        autenticar("admin@nexusos.com", "ROLE_ADMIN");
        var inicio = LocalDate.of(2026, 7, 1);
        var fim = LocalDate.of(2026, 7, 31);
        var entrega = ordem(1, StatusOS.EM_DESENVOLVIMENTO, inicio.plusDays(2), false, null);
        var vencimento = ordem(2, StatusOS.AGUARDANDO_PAGAMENTO, inicio.plusDays(3), false, null);
        var finalizada = ordem(3, StatusOS.FINALIZADA, null, true, inicio.plusDays(4).atStartOfDay().atOffset(java.time.ZoneOffset.UTC));
        when(ordemServicoRepository.buscarParaCalendario(inicio, fim, null, null, null, null, null, null))
                .thenReturn(List.of(entrega, vencimento, finalizada));

        var eventos = calendarioService.listar(inicio, fim, null, null, null, null, null);

        assertThat(eventos).extracting(evento -> evento.tipo()).containsExactly(
                TipoEventoCalendario.ENTREGA_PREVISTA,
                TipoEventoCalendario.VENCIMENTO,
                TipoEventoCalendario.EVENTO_IMPORTANTE);
    }

    @Test
    void desenvolvedorFicaRestritoAoProprioEmail() {
        autenticar("dev@nexusos.com", "ROLE_DESENVOLVEDOR");
        var inicio = LocalDate.of(2026, 7, 1);
        var fim = LocalDate.of(2026, 7, 31);
        var outroResponsavel = UUID.randomUUID();
        when(ordemServicoRepository.buscarParaCalendario(
                inicio, fim, outroResponsavel, null, null, null, null, "dev@nexusos.com"))
                .thenReturn(List.of());

        assertThat(calendarioService.listar(inicio, fim, outroResponsavel, null, null, null, null)).isEmpty();

        verify(ordemServicoRepository).buscarParaCalendario(
                inicio, fim, outroResponsavel, null, null, null, null, "dev@nexusos.com");
    }

    @Test
    void rejeitaIntervaloInvertido() {
        assertThatThrownBy(() -> calendarioService.listar(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 7, 1), null, null, null, null, null))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("data final");
    }

    private OrdemServico ordem(long codigo, StatusOS status, LocalDate prazo, boolean paga, OffsetDateTime finalizadoEm) {
        return OrdemServico.builder()
                .id(UUID.randomUUID()).codigo(codigo).titulo("OS " + codigo).descricao("Descricao")
                .cliente(Cliente.builder().id(UUID.randomUUID()).nome("Cliente").build())
                .status(status).prioridade(PrioridadeOS.MEDIA).prazo(prazo)
                .cobrar(true).paga(paga).finalizadoEm(finalizadoEm).build();
    }

    private void autenticar(String email, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority(role))));
    }
}
