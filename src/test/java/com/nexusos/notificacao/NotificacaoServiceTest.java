package com.nexusos.notificacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.dto.PreferenciaNotificacaoItem;
import com.nexusos.notificacao.dto.PreferenciasNotificacaoRequest;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioRepository;
import com.nexusos.usuario.UsuarioService;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NotificacaoServiceTest {

    private NotificacaoRepository notificacaoRepository;
    private PreferenciaNotificacaoRepository preferenciaRepository;
    private UsuarioService usuarioService;
    private UsuarioRepository usuarioRepository;
    private NotificacaoService service;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        notificacaoRepository = mock(NotificacaoRepository.class);
        preferenciaRepository = mock(PreferenciaNotificacaoRepository.class);
        usuarioService = mock(UsuarioService.class);
        usuarioRepository = mock(UsuarioRepository.class);
        service = new NotificacaoService(
                notificacaoRepository,
                preferenciaRepository,
                usuarioService,
                usuarioRepository,
                mock(OrdemServicoRepository.class)
        );
        usuario = Usuario.builder().id(UUID.randomUUID()).perfil(PerfilUsuario.ADMIN).build();
        when(usuarioService.buscarAutenticado()).thenReturn(usuario);
    }

    @Test
    void deveRetornarTodosOsTiposHabilitadosQuandoNaoHaPreferenciasPersistidas() {
        when(preferenciaRepository.findByUsuarioId(usuario.getId())).thenReturn(List.of());

        var resposta = service.consultarPreferencias();

        assertThat(resposta.preferencias()).hasSize(TipoPreferenciaNotificacao.values().length);
        assertThat(resposta.preferencias()).allMatch(PreferenciaNotificacaoItem::habilitada);
    }

    @Test
    void naoDeveCriarNotificacaoDeTipoDesabilitado() {
        var ordem = OrdemServico.builder().id(UUID.randomUUID()).codigo(123L).build();
        when(usuarioRepository.findByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)).thenReturn(List.of(usuario));
        when(preferenciaRepository.existsByUsuarioIdAndTipoAndHabilitadaFalse(
                usuario.getId(), TipoPreferenciaNotificacao.ALTERACAO_STATUS
        )).thenReturn(true);

        service.notificarStatus(ordem);

        verify(notificacaoRepository, never()).save(any());
    }

    @Test
    void deveRejeitarTiposDuplicadosNaAtualizacao() {
        var itens = Arrays.stream(TipoPreferenciaNotificacao.values())
                .map(tipo -> new PreferenciaNotificacaoItem(tipo, true))
                .toList();
        var duplicados = new java.util.ArrayList<>(itens);
        duplicados.set(duplicados.size() - 1, new PreferenciaNotificacaoItem(TipoPreferenciaNotificacao.OS_ATRIBUIDA, false));

        assertThatThrownBy(() -> service.atualizarPreferencias(new PreferenciasNotificacaoRequest(duplicados)))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Cada tipo de notificacao deve ser informado uma unica vez.");

        verify(preferenciaRepository, never()).save(any());
    }
}
