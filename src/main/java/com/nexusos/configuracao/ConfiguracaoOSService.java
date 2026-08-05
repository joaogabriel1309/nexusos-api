package com.nexusos.configuracao;

import com.nexusos.configuracao.dto.*;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.usuario.UsuarioService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ConfiguracaoOSService {
    private final ConfiguracaoOSRepository repository;
    private final UsuarioService usuarioService;

    @Transactional(readOnly = true) public ConfiguracaoOSResponse buscar() { return ConfiguracaoOSResponse.from(buscarEntidade()); }
    @Transactional(readOnly = true) public ConfiguracaoOS buscarEntidade() {
        return repository.findById(ConfiguracaoOS.ID).orElseThrow(() -> new RecursoNaoEncontradoException("Configuracoes de ticket nao encontradas."));
    }
    @Transactional public ConfiguracaoOSResponse atualizar(ConfiguracaoOSRequest r) {
        var c = buscarEntidade();
        var responsavel = r.responsavelPadraoId() == null ? null : usuarioService.buscarEntidade(r.responsavelPadraoId());
        if (responsavel != null && !responsavel.isAtivo()) throw new RegraNegocioException("O responsavel padrao deve estar ativo.");
        if (responsavel == null && !r.permitirSemResponsavel()) throw new RegraNegocioException("Defina um responsável padrão ou permita tickets sem responsável.");
        c.setPrazoBaixaDias(r.prazoBaixaDias()); c.setPrazoMediaDias(r.prazoMediaDias());
        c.setPrazoAltaDias(r.prazoAltaDias()); c.setPrazoCriticaDias(r.prazoCriticaDias());
        c.setPrioridadePadrao(r.prioridadePadrao()); c.setResponsavelPadrao(responsavel);
        c.setPermitirSemResponsavel(r.permitirSemResponsavel()); c.setStatusInicial(r.statusInicial());
        c.setExigirAnaliseAntesCliente(r.exigirAnaliseAntesCliente());
        c.setExigirAprovacaoAdminAntesCliente(r.exigirAprovacaoAdminAntesCliente());
        return ConfiguracaoOSResponse.from(repository.save(c));
    }
    public LocalDate calcularPrazo(PrioridadeOS p) {
        var c = buscarEntidade();
        int dias = switch (p) { case BAIXA -> c.getPrazoBaixaDias(); case MEDIA -> c.getPrazoMediaDias(); case ALTA -> c.getPrazoAltaDias(); case CRITICA -> c.getPrazoCriticaDias(); };
        return LocalDate.now().plusDays(dias);
    }
}
