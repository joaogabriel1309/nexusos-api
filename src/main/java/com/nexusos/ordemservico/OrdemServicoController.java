package com.nexusos.ordemservico;

import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import com.nexusos.ordemservico.dto.OrdemServicoRequest;
import com.nexusos.ordemservico.dto.OrdemServicoResponse;
import com.nexusos.ordemservico.dto.OrdemServicoUpdateRequest;
import com.nexusos.ordemservico.dto.PagamentoUpdateRequest;
import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.ordemservico.dto.ResponsavelUpdateRequest;
import com.nexusos.ordemservico.dto.StatusUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ordens-servico")
@RequiredArgsConstructor
public class OrdemServicoController {

    private final OrdemServicoService ordemServicoService;

    @Operation(summary = "Lista ordens de servico")
    @GetMapping
    public ResponseEntity<List<OrdemServicoResponse>> listar() {
        return ResponseEntity.ok(ordemServicoService.listar());
    }

    @Operation(summary = "Busca ordem de servico por ID")
    @GetMapping("/{id}")
    public ResponseEntity<OrdemServicoResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ordemServicoService.buscarPorId(id));
    }

    @Operation(summary = "Cria ordem de servico")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrdemServicoResponse> criar(@Valid @RequestBody OrdemServicoRequest request) {
        var response = ordemServicoService.criar(request);
        return ResponseEntity.created(URI.create("/api/v1/ordens-servico/" + response.id())).body(response);
    }

    @Operation(summary = "Atualiza ordem de servico")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrdemServicoResponse> atualizar(@PathVariable UUID id,
            @Valid @RequestBody OrdemServicoUpdateRequest request) {
        return ResponseEntity.ok(ordemServicoService.atualizar(id, request));
    }

    @Operation(summary = "Exclui ordem de servico")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        ordemServicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Atualiza status da ordem de servico")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<OrdemServicoResponse> atualizarStatus(@PathVariable UUID id,
            @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(ordemServicoService.atualizarStatus(id, request));
    }

    @Operation(summary = "Atualiza analise tecnica da ordem de servico")
    @PatchMapping("/{id}/analise")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<OrdemServicoResponse> atualizarAnalise(@PathVariable UUID id,
            @Valid @RequestBody AnaliseUpdateRequest request) {
        return ResponseEntity.ok(ordemServicoService.atualizarAnalise(id, request));
    }

    @Operation(summary = "Atualiza responsavel da ordem de servico")
    @PatchMapping("/{id}/responsavel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrdemServicoResponse> atualizarResponsavel(@PathVariable UUID id,
            @Valid @RequestBody ResponsavelUpdateRequest request) {
        return ResponseEntity.ok(ordemServicoService.atualizarResponsavel(id, request));
    }

    @Operation(summary = "Atualiza prioridade da ordem de servico")
    @PatchMapping("/{id}/prioridade")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrdemServicoResponse> atualizarPrioridade(@PathVariable UUID id,
            @Valid @RequestBody PrioridadeUpdateRequest request) {
        return ResponseEntity.ok(ordemServicoService.atualizarPrioridade(id, request));
    }

    @Operation(summary = "Atualiza pagamento da ordem de servico")
    @PatchMapping("/{id}/pagamento")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrdemServicoResponse> atualizarPagamento(@PathVariable UUID id,
            @Valid @RequestBody PagamentoUpdateRequest request) {
        return ResponseEntity.ok(ordemServicoService.atualizarPagamento(id, request.paga()));
    }
}
