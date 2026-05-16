package com.nexusos.anexo;

import com.nexusos.anexo.dto.AnexoResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ordens-servico/{ordemServicoId}/anexos")
@RequiredArgsConstructor
public class AnexoController {
    private final AnexoService anexoService;

    @Operation(summary = "Lista anexos da OS")
    @GetMapping
    public ResponseEntity<List<AnexoResponse>> listar(@PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(anexoService.listar(ordemServicoId));
    }

    @Operation(summary = "Salva anexo local da OS")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnexoResponse> salvar(@PathVariable UUID ordemServicoId,
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam(value = "descricao", required = false) String descricao) {
        var response = anexoService.salvar(ordemServicoId, arquivo, descricao);
        return ResponseEntity.created(URI.create("/api/v1/ordens-servico/" + ordemServicoId + "/anexos"))
                .body(response);
    }
}
