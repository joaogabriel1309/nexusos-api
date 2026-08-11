package com.nexusos.comentario;

import com.nexusos.comentario.dto.ComentarioRequest;
import com.nexusos.comentario.dto.ComentarioResponse;
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
public class ComentarioService {
    private final ComentarioRepository comentarioRepository;
    private final OrdemServicoService ordemServicoService;
    private final UsuarioService usuarioService;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<ComentarioResponse> listar(UUID ordemServicoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        return comentarioRepository.findByOrdemServicoIdOrderByCriadoEmAsc(ordemServicoId).stream()
                .map(ComentarioResponse::from).toList();
    }

    @Transactional
    public ComentarioResponse criar(UUID ordemServicoId, ComentarioRequest request) {
        var comentario = new Comentario();
        var ordemServico = ordemServicoService.buscarEntidade(ordemServicoId);
        var usuario = usuarioService.buscarAutenticado();
        comentario.setOrdemServico(ordemServico);
        comentario.setUsuario(usuario);
        comentario.setMensagem(request.mensagem());
        var salvo = comentarioRepository.save(comentario);
        notificacaoService.notificarComentario(ordemServico, usuario);
        return ComentarioResponse.from(salvo);
    }
}
