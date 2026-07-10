package com.nexusos.checklist;

import com.nexusos.checklist.dto.ChecklistRequest;
import com.nexusos.checklist.dto.ChecklistResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChecklistController {
    private final ChecklistService checklistService;

    @Operation(summary = "Lista checklist da OS")
    @GetMapping("/api/v1/ordens-servico/{ordemServicoId}/checklist")
    public ResponseEntity<List<ChecklistResponse>> listar(@PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(checklistService.listar(ordemServicoId));
    }

    @Operation(summary = "Cria item de checklist da OS")
    @PostMapping("/api/v1/ordens-servico/{ordemServicoId}/checklist")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<ChecklistResponse> criar(@PathVariable UUID ordemServicoId,
            @Valid @RequestBody ChecklistRequest request) {
        var response = checklistService.criar(ordemServicoId, request);
        return ResponseEntity.created(URI.create("/api/v1/checklist/" + response.id())).body(response);
    }

    @Operation(summary = "Conclui item de checklist")
    @PatchMapping("/api/v1/checklist/{id}/concluir")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<ChecklistResponse> concluir(@PathVariable UUID id) {
        return ResponseEntity.ok(checklistService.concluir(id));
    }
}
