package com.nexusos.cliente;

import com.nexusos.cliente.dto.ClienteRequest;
import com.nexusos.cliente.dto.ClienteResponse;
import com.nexusos.cliente.dto.ClienteUpdateRequest;
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
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @Operation(summary = "Lista clientes")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<List<ClienteResponse>> listar() {
        return ResponseEntity.ok(clienteService.listar());
    }

    @Operation(summary = "Busca cliente por ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<ClienteResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(clienteService.buscarPorId(id));
    }

    @Operation(summary = "Cria cliente")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<ClienteResponse> criar(@Valid @RequestBody ClienteRequest request) {
        var response = clienteService.criar(request);
        return ResponseEntity.created(URI.create("/api/v1/clientes/" + response.id())).body(response);
    }

    @Operation(summary = "Atualiza cliente")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<ClienteResponse> atualizar(@PathVariable UUID id,
            @Valid @RequestBody ClienteUpdateRequest request) {
        return ResponseEntity.ok(clienteService.atualizar(id, request));
    }

    @Operation(summary = "Gera novo link de acesso do cliente")
    @PatchMapping("/{id}/token-acesso")
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA')")
    public ResponseEntity<ClienteResponse> gerarTokenAcesso(@PathVariable UUID id) {
        return ResponseEntity.ok(clienteService.gerarNovoTokenAcesso(id));
    }

    @Operation(summary = "Inativa cliente")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> inativar(@PathVariable UUID id) {
        clienteService.inativar(id);
        return ResponseEntity.noContent().build();
    }
}
