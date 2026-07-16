package com.nexusos.ordemservico.calendario;

import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.ordemservico.calendario.dto.EventoCalendarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/calendario")
@RequiredArgsConstructor
public class CalendarioController {

    private final CalendarioService calendarioService;

    @Operation(summary = "Lista eventos de ordens de servico no calendario")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<List<EventoCalendarioResponse>> listar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) UUID responsavelId,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) UUID projetoId,
            @RequestParam(required = false) PrioridadeOS prioridade,
            @RequestParam(required = false) StatusOS status) {
        return ResponseEntity.ok(calendarioService.listar(
                inicio, fim, responsavelId, clienteId, projetoId, prioridade, status));
    }
}
