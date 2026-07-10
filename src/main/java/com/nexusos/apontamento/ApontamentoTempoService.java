package com.nexusos.apontamento;

import com.nexusos.apontamento.dto.ApontamentoTempoRequest;
import com.nexusos.apontamento.dto.ApontamentoTempoResponse;
import com.nexusos.exception.RegraNegocioException;
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
        apontamento.setOrdemServico(ordemServicoService.buscarEntidade(ordemServicoId));
        apontamento.setUsuario(usuarioService.buscarEntidade(request.usuarioId()));
        apontamento.setDescricao(request.descricao());
        apontamento.setInicio(request.inicio());
        apontamento.setFim(request.fim());
        return ApontamentoTempoResponse.from(apontamentoTempoRepository.save(apontamento));
    }
}
