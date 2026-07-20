package com.nexusos.whatsapp;

import com.nexusos.whatsapp.dto.ConfiguracaoWhatsappRequest;
import com.nexusos.whatsapp.dto.ConfiguracaoWhatsappResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configuracoes/whatsapp")
@RequiredArgsConstructor
public class ConfiguracaoWhatsappController {
    private final ConfiguracaoWhatsappService service;

    @Operation(summary = "Consulta a configuracao de WhatsApp")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<ConfiguracaoWhatsappResponse> buscar() {
        return ResponseEntity.ok(service.buscar());
    }

    @Operation(summary = "Atualiza a configuracao de WhatsApp")
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ConfiguracaoWhatsappResponse> atualizar(
            @Valid @RequestBody ConfiguracaoWhatsappRequest request) {
        return ResponseEntity.ok(service.atualizar(request));
    }

    @Operation(summary = "Envia uma mensagem para testar a configuracao de WhatsApp")
    @PostMapping("/teste")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> testar() {
        service.enviarTeste();
        return ResponseEntity.noContent().build();
    }
}

