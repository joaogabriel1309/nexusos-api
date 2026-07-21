package com.nexusos.configuracao;

import com.nexusos.configuracao.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/configuracoes/os") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ConfiguracaoOSController {
    private final ConfiguracaoOSService service;
    @GetMapping public ResponseEntity<ConfiguracaoOSResponse> buscar() { return ResponseEntity.ok(service.buscar()); }
    @PutMapping public ResponseEntity<ConfiguracaoOSResponse> atualizar(@Valid @RequestBody ConfiguracaoOSRequest request) { return ResponseEntity.ok(service.atualizar(request)); }
}
