package com.nexusos.configuracao;

import com.nexusos.configuracao.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/configuracoes/ia") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ConfiguracaoIAController {
    private final ConfiguracaoIAService service;
    @GetMapping public ResponseEntity<ConfiguracaoIAResponse> buscar() { return ResponseEntity.ok(service.buscar()); }
    @PutMapping public ResponseEntity<ConfiguracaoIAResponse> atualizar(@Valid @RequestBody ConfiguracaoIARequest request) {
        return ResponseEntity.ok(service.atualizar(request));
    }
}
