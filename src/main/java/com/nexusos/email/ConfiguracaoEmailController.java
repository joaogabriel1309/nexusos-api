package com.nexusos.email;

import com.nexusos.email.dto.ConfiguracaoEmailRequest;
import com.nexusos.email.dto.ConfiguracaoEmailResponse;
import com.nexusos.email.dto.EmailTesteRequest;
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
@RequestMapping("/api/v1/configuracoes/email")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ConfiguracaoEmailController {
    private final ConfiguracaoEmailService service;

    @Operation(summary = "Consulta a configuracao de e-mail")
    @GetMapping
    public ResponseEntity<ConfiguracaoEmailResponse> buscar() {
        return ResponseEntity.ok(service.buscar());
    }

    @Operation(summary = "Atualiza a configuracao de e-mail")
    @PutMapping
    public ResponseEntity<ConfiguracaoEmailResponse> atualizar(@Valid @RequestBody ConfiguracaoEmailRequest request) {
        return ResponseEntity.ok(service.atualizar(request));
    }

    @Operation(summary = "Envia um e-mail para testar a configuracao SMTP")
    @PostMapping("/teste")
    public ResponseEntity<Void> testar(@Valid @RequestBody EmailTesteRequest request) {
        service.enviarTeste(request.destinatario());
        return ResponseEntity.noContent().build();
    }
}
