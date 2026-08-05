package com.nexusos.dashboard;

import com.nexusos.dashboard.dto.DashboardResumoResponse;
import com.nexusos.dashboard.dto.FinalizadasPorMesResponse;
import com.nexusos.dashboard.dto.ProdutividadeResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Retorna resumo geral do dashboard")
    @GetMapping("/resumo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardResumoResponse> resumo() {
        return ResponseEntity.ok(dashboardService.resumo());
    }

    @Operation(summary = "Retorna quantidade de ticket por status")
    @GetMapping("/os-por-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> osPorStatus() {
        return ResponseEntity.ok(dashboardService.osPorStatus());
    }

    @Operation(summary = "Retorna metricas simples de produtividade")
    @GetMapping("/produtividade")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProdutividadeResponse> produtividade() {
        return ResponseEntity.ok(dashboardService.produtividade());
    }

    @Operation(summary = "Retorno tickets finalizados por mes")
    @GetMapping("/finalizadas-por-mes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FinalizadasPorMesResponse>> finalizadasPorMes() {
        return ResponseEntity.ok(dashboardService.finalizadasPorMes());
    }
}
