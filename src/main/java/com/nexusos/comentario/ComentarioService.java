package com.nexusos.comentario;

import com.nexusos.comentario.dto.ComentarioRequest;
import com.nexusos.comentario.dto.ComentarioResponse;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.usuario.UsuarioService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ComentarioService {
    private final ComentarioRepository comentarioRepository;
    private final OrdemServicoService ordemServicoService;
    private final UsuarioService usuarioService;

    @Transactional(readOnly = true)
    public List<ComentarioResponse> listar(UUID ordemServicoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        return comentarioRepository.findByOrdemServicoIdOrderByCriadoEmAsc(ordemServicoId).stream()
                .map(ComentarioResponse::from).toList();
    }

    @Transactional
    public ComentarioResponse criar(UUID ordemServicoId, ComentarioRequest request) {
        var comentario = new Comentario();
        comentario.setOrdemServico(ordemServicoService.buscarEntidade(ordemServicoId));
        comentario.setUsuario(usuarioService.buscarEntidade(request.usuarioId()));
        comentario.setMensagem(request.mensagem());
        return ComentarioResponse.from(comentarioRepository.save(comentario));
    }
}
