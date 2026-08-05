package com.nexusos.configuracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.configuracao.dto.ConfiguracaoOSRequest;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConfiguracaoOSServiceTest {

    @Mock ConfiguracaoOSRepository repository;
    @Mock UsuarioService usuarioService;
    @InjectMocks ConfiguracaoOSService service;

    @Test
    void atualizaTodosOsPadroesComResponsavelAtivo() {
        var responsavelId = UUID.randomUUID();
        var responsavel = Usuario.builder().id(responsavelId).nome("Responsavel").ativo(true).build();
        var configuracao = configuracaoExistente();
        var request = new ConfiguracaoOSRequest(12, 7, 3, 1, PrioridadeOS.ALTA, responsavelId,
                false, StatusOS.EM_ANALISE, true, false);
        when(repository.findById(ConfiguracaoOS.ID)).thenReturn(Optional.of(configuracao));
        when(usuarioService.buscarEntidade(responsavelId)).thenReturn(responsavel);
        when(repository.save(configuracao)).thenReturn(configuracao);

        var resposta = service.atualizar(request);

        assertThat(resposta.prazoBaixaDias()).isEqualTo(12);
        assertThat(resposta.prioridadePadrao()).isEqualTo(PrioridadeOS.ALTA);
        assertThat(resposta.responsavelPadraoId()).isEqualTo(responsavelId);
        assertThat(resposta.permitirSemResponsavel()).isFalse();
        assertThat(resposta.statusInicial()).isEqualTo(StatusOS.EM_ANALISE);
        assertThat(resposta.exigirAnaliseAntesCliente()).isTrue();
        assertThat(resposta.exigirAprovacaoAdminAntesCliente()).isFalse();
        verify(repository).save(configuracao);
    }

    @Test
    void rejeitaConfiguracaoSemResponsavelQuandoOsDesatribuidasNaoSaoPermitidas() {
        var configuracao = configuracaoExistente();
        when(repository.findById(ConfiguracaoOS.ID)).thenReturn(Optional.of(configuracao));
        var request = new ConfiguracaoOSRequest(10, 5, 2, 1, PrioridadeOS.MEDIA, null,
                false, StatusOS.RECEBIDA, false, true);

        assertThatThrownBy(() -> service.atualizar(request))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("responsável padrão");
    }

    @Test
    void rejeitaResponsavelPadraoInativo() {
        var responsavelId = UUID.randomUUID();
        var inativo = Usuario.builder().id(responsavelId).ativo(false).build();
        when(repository.findById(ConfiguracaoOS.ID)).thenReturn(Optional.of(configuracaoExistente()));
        when(usuarioService.buscarEntidade(responsavelId)).thenReturn(inativo);
        var request = new ConfiguracaoOSRequest(10, 5, 2, 1, PrioridadeOS.MEDIA, responsavelId,
                true, StatusOS.RECEBIDA, false, true);

        assertThatThrownBy(() -> service.atualizar(request))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("ativo");
    }

    private ConfiguracaoOS configuracaoExistente() {
        var configuracao = new ConfiguracaoOS();
        configuracao.setId(ConfiguracaoOS.ID);
        configuracao.setPrazoBaixaDias(10);
        configuracao.setPrazoMediaDias(5);
        configuracao.setPrazoAltaDias(2);
        configuracao.setPrazoCriticaDias(1);
        configuracao.setPrioridadePadrao(PrioridadeOS.MEDIA);
        configuracao.setPermitirSemResponsavel(true);
        configuracao.setStatusInicial(StatusOS.RECEBIDA);
        configuracao.setExigirAnaliseAntesCliente(false);
        configuracao.setExigirAprovacaoAdminAntesCliente(true);
        return configuracao;
    }
}
