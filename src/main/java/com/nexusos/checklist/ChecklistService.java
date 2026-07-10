package com.nexusos.checklist;

import com.nexusos.checklist.dto.ChecklistRequest;
import com.nexusos.checklist.dto.ChecklistResponse;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.notificacao.NotificacaoService;
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
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<ChecklistResponse> listar(UUID ordemServicoId) {
        ordemServicoService.buscarEntidade(ordemServicoId);
        return checklistRepository.findByOrdemServicoIdOrderByCriadoEmAsc(ordemServicoId).stream()
                .map(ChecklistResponse::from).toList();
    }

    @Transactional
    public ChecklistResponse criar(UUID ordemServicoId, ChecklistRequest request) {
        var item = new ChecklistItem();
        var ordemServico = ordemServicoService.buscarEntidade(ordemServicoId);
        item.setOrdemServico(ordemServico);
        item.setDescricao(request.descricao());
        item.setObrigatorio(request.obrigatorio());
        var salvo = checklistRepository.save(item);
        notificacaoService.notificarChecklist(ordemServico, "novo item " + salvo.getDescricao());
        return ChecklistResponse.from(salvo);
    }

    @Transactional
    public ChecklistResponse concluir(UUID id) {
        var item = checklistRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Item de checklist nao encontrado."));
        ordemServicoService.buscarEntidade(item.getOrdemServico().getId());
        item.setConcluido(true);
        item.setConcluidoEm(OffsetDateTime.now());
        var salvo = checklistRepository.save(item);
        notificacaoService.notificarChecklist(salvo.getOrdemServico(), "item concluido " + salvo.getDescricao());
        return ChecklistResponse.from(salvo);
    }
}
