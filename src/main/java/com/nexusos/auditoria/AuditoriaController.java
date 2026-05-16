package com.nexusos.auditoria;

import com.nexusos.auditoria.dto.AuditoriaOSResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auditoria")
@RequiredArgsConstructor
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    @Operation(summary = "Lista auditoria de uma ordem de servico")
    @GetMapping("/ordens-servico/{id}")
    public ResponseEntity<List<AuditoriaOSResponse>> listarPorOrdemServico(@PathVariable UUID id) {
        return ResponseEntity.ok(auditoriaService.listarPorOrdemServico(id));
    }
}
