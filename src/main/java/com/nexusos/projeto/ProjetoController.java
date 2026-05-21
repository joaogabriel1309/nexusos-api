package com.nexusos.projeto;

import com.nexusos.projeto.dto.ProjetoRequest;
import com.nexusos.projeto.dto.ProjetoResponse;
import com.nexusos.projeto.dto.ProjetoUpdateRequest;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projetos")
@RequiredArgsConstructor
public class ProjetoController {

    private final ProjetoService projetoService;

    @Operation(summary = "Lista projetos")
    @GetMapping
    public ResponseEntity<List<ProjetoResponse>> listar() {
        return ResponseEntity.ok(projetoService.listar());
    }

    @Operation(summary = "Busca projeto por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ProjetoResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(projetoService.buscarPorId(id));
    }

    @Operation(summary = "Cria projeto")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<ProjetoResponse> criar(@Valid @RequestBody ProjetoRequest request) {
        var response = projetoService.criar(request);
        return ResponseEntity.created(URI.create("/api/v1/projetos/" + response.id())).body(response);
    }

    @Operation(summary = "Atualiza projeto")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<ProjetoResponse> atualizar(@PathVariable UUID id,
            @Valid @RequestBody ProjetoUpdateRequest request) {
        return ResponseEntity.ok(projetoService.atualizar(id, request));
    }

    @Operation(summary = "Inativa projeto")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> inativar(@PathVariable UUID id) {
        projetoService.inativar(id);
        return ResponseEntity.noContent().build();
    }
}
