package com.nexusos.comentario;

import com.nexusos.comentario.dto.ComentarioRequest;
import com.nexusos.comentario.dto.ComentarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ordens-servico/{ordemServicoId}/comentarios")
@RequiredArgsConstructor
public class ComentarioController {
    private final ComentarioService comentarioService;

    @Operation(summary = "Lista comentarios da OS")
    @GetMapping
    public ResponseEntity<List<ComentarioResponse>> listar(@PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(comentarioService.listar(ordemServicoId));
    }

    @Operation(summary = "Cria comentario na OS")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ANALISTA','DESENVOLVEDOR')")
    public ResponseEntity<ComentarioResponse> criar(@PathVariable UUID ordemServicoId,
            @Valid @RequestBody ComentarioRequest request) {
        var response = comentarioService.criar(ordemServicoId, request);
        return ResponseEntity.created(URI.create("/api/v1/ordens-servico/" + ordemServicoId + "/comentarios"))
                .body(response);
    }
}
