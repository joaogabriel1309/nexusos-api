package com.nexusos.pagamento;

import com.nexusos.pagamento.dto.ConfiguracaoPagamentoRequest;
import com.nexusos.pagamento.dto.ConfiguracaoPagamentoResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/configuracoes/pagamento") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ConfiguracaoPagamentoController {
    private final ConfiguracaoPagamentoService service;
    @GetMapping public ResponseEntity<ConfiguracaoPagamentoResponse> buscar() { return ResponseEntity.ok(service.buscar()); }
    @PutMapping public ResponseEntity<ConfiguracaoPagamentoResponse> atualizar(@Valid @RequestBody ConfiguracaoPagamentoRequest request) { return ResponseEntity.ok(service.atualizar(request)); }
}
