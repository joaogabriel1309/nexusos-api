package com.nexusos.apontamento;

import com.nexusos.apontamento.dto.ApontamentoTempoRequest;
import com.nexusos.apontamento.dto.ApontamentoTempoResponse;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.usuario.UsuarioService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ApontamentoTempoService {
    private final ApontamentoTempoRepository apontamentoTempoRepository;
    private final OrdemServicoService ordemServicoService;
    private final UsuarioService usuarioService;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<ApontamentoTempoResponse> listar(UUID ordemServicoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        return apontamentoTempoRepository.findByOrdemServicoIdOrderByInicioDesc(ordemServicoId).stream()
                .map(ApontamentoTempoResponse::from).toList();
    }

    @Transactional
    public ApontamentoTempoResponse criar(UUID ordemServicoId, ApontamentoTempoRequest request) {
        if (!request.fim().isAfter(request.inicio())) {
            throw new RegraNegocioException("Fim deve ser posterior ao inicio.");
        }
        var apontamento = new ApontamentoTempo();
        var ordemServico = ordemServicoService.buscarEntidade(ordemServicoId);
        var usuario = usuarioService.buscarEntidade(request.usuarioId());
        apontamento.setOrdemServico(ordemServico);
        apontamento.setUsuario(usuario);
        apontamento.setDescricao(request.descricao());
        apontamento.setInicio(request.inicio());
        apontamento.setFim(request.fim());
        var salvo = apontamentoTempoRepository.save(apontamento);
        notificacaoService.notificarApontamento(ordemServico, usuario, "novo apontamento registrado");
        return ApontamentoTempoResponse.from(salvo);
    }
}
