package com.nexusos.auditoria;

import com.nexusos.auditoria.dto.AuditoriaOSResponse;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.usuario.Usuario;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final AuditoriaOSRepository auditoriaOSRepository;

    @Transactional
    public void registrar(OrdemServico ordemServico, Usuario usuario, String tipoEvento, String descricao,
            StatusOS statusAnterior, StatusOS statusNovo) {
        auditoriaOSRepository.save(AuditoriaOS.builder()
                .ordemServico(ordemServico)
                .usuario(usuario)
                .tipoEvento(tipoEvento)
                .descricao(descricao)
                .statusAnterior(statusAnterior)
                .statusNovo(statusNovo)
                .build());
    }

    @Transactional(readOnly = true)
    public List<AuditoriaOSResponse> listarPorOrdemServico(UUID ordemServicoId) {
        return auditoriaOSRepository.findByOrdemServicoIdOrderByCriadoEmDesc(ordemServicoId)
                .stream()
                .map(AuditoriaOSResponse::from)
                .toList();
    }
}
