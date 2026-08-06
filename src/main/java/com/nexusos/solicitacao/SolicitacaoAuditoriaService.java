package com.nexusos.solicitacao;

import com.nexusos.solicitacao.dto.AuditoriaSolicitacaoResponse;
import com.nexusos.usuario.Usuario;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SolicitacaoAuditoriaService {
    private final AuditoriaSolicitacaoRepository repository;

    @Transactional
    public void registrar(Solicitacao solicitacao, Usuario usuario, OrigemSolicitacao origem,
            String tipo, String descricao, StatusSolicitacao anterior, StatusSolicitacao novo) {
        var auditoria = new AuditoriaSolicitacao();
        auditoria.setSolicitacao(solicitacao);
        auditoria.setUsuario(usuario);
        auditoria.setOrigem(origem);
        auditoria.setTipoEvento(tipo);
        auditoria.setDescricao(descricao);
        auditoria.setStatusAnterior(anterior);
        auditoria.setStatusNovo(novo);
        repository.save(auditoria);
    }

    @Transactional(readOnly = true)
    public List<AuditoriaSolicitacaoResponse> listar(UUID solicitacaoId) {
        return repository.findBySolicitacaoIdOrderByCriadoEmDesc(solicitacaoId).stream()
                .map(AuditoriaSolicitacaoResponse::from)
                .toList();
    }
}
