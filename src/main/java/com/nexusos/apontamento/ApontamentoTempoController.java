package com.nexusos.apontamento;

import com.nexusos.apontamento.dto.ApontamentoTempoRequest;
import com.nexusos.apontamento.dto.ApontamentoTempoResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ordens-servico/{ordemServicoId}/apontamentos")
@RequiredArgsConstructor
public class ApontamentoTempoController {
    private final ApontamentoTempoService apontamentoTempoService;

    @Operation(summary = "Lista apontamentos de tempo da OS")
    @GetMapping
    public ResponseEntity<List<ApontamentoTempoResponse>> listar(@PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(apontamentoTempoService.listar(ordemServicoId));
    }

    @Operation(summary = "Cria apontamento de tempo da OS")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<ApontamentoTempoResponse> criar(@PathVariable UUID ordemServicoId,
            @Valid @RequestBody ApontamentoTempoRequest request) {
        var response = apontamentoTempoService.criar(ordemServicoId, request);
        return ResponseEntity.created(URI.create("/api/v1/ordens-servico/" + ordemServicoId + "/apontamentos"))
                .body(response);
    }
}
