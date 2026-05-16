package com.nexusos.checklist;

import com.nexusos.checklist.dto.ChecklistRequest;
import com.nexusos.checklist.dto.ChecklistResponse;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.ordemservico.OrdemServicoService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChecklistService {
    private final ChecklistRepository checklistRepository;
    private final OrdemServicoService ordemServicoService;

    @Transactional(readOnly = true)
    public List<ChecklistResponse> listar(UUID ordemServicoId) {
        return checklistRepository.findByOrdemServicoIdOrderByCriadoEmAsc(ordemServicoId).stream()
                .map(ChecklistResponse::from).toList();
    }

    @Transactional
    public ChecklistResponse criar(UUID ordemServicoId, ChecklistRequest request) {
        var item = new ChecklistItem();
        item.setOrdemServico(ordemServicoService.buscarEntidade(ordemServicoId));
        item.setDescricao(request.descricao());
        item.setObrigatorio(request.obrigatorio());
        return ChecklistResponse.from(checklistRepository.save(item));
    }

    @Transactional
    public ChecklistResponse concluir(UUID id) {
        var item = checklistRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Item de checklist nao encontrado."));
        item.setConcluido(true);
        item.setConcluidoEm(OffsetDateTime.now());
        return ChecklistResponse.from(checklistRepository.save(item));
    }
}
