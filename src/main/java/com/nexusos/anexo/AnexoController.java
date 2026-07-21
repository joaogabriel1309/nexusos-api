package com.nexusos.anexo;

import com.nexusos.anexo.dto.AnexoResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpHeaders;
import java.nio.charset.StandardCharsets;
import org.springframework.web.util.UriUtils;

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
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<AnexoResponse> salvar(@PathVariable UUID ordemServicoId,
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam(value = "descricao", required = false) String descricao) {
        var response = anexoService.salvar(ordemServicoId, arquivo, descricao);
        return ResponseEntity.created(URI.create("/api/v1/ordens-servico/" + ordemServicoId + "/anexos"))
                .body(response);
    }

    @GetMapping("/{anexoId}/arquivo")
    public ResponseEntity<org.springframework.core.io.Resource> baixar(@PathVariable UUID ordemServicoId,
            @PathVariable UUID anexoId) {
        var download = anexoService.baixar(ordemServicoId, anexoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.tipoArquivo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" +
                        UriUtils.encode(download.nomeArquivo(), StandardCharsets.UTF_8))
                .body(download.recurso());
    }

    @DeleteMapping("/{anexoId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable UUID ordemServicoId, @PathVariable UUID anexoId) {
        anexoService.excluir(ordemServicoId, anexoId);
        return ResponseEntity.noContent().build();
    }
}
