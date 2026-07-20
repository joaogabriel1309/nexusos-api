package com.nexusos.configuracao;

import com.nexusos.configuracao.dto.ConfiguracaoEmpresaRequest;
import com.nexusos.configuracao.dto.ConfiguracaoEmpresaResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configuracoes/empresa")
@RequiredArgsConstructor
public class ConfiguracaoEmpresaController {
    private final ConfiguracaoEmpresaService service;

    @Operation(summary = "Consulta as configurações da empresa")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<ConfiguracaoEmpresaResponse> buscar() {
        return ResponseEntity.ok(service.buscar());
    }

    @Operation(summary = "Atualiza as configurações da empresa")
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ConfiguracaoEmpresaResponse> atualizar(@Valid @RequestBody ConfiguracaoEmpresaRequest request) {
        return ResponseEntity.ok(service.atualizar(request));
    }
}
