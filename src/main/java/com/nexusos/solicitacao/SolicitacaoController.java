package com.nexusos.solicitacao;

import com.nexusos.solicitacao.dto.SolicitacaoContagemResponse;
import com.nexusos.solicitacao.dto.SolicitacaoConversaoRequest;
import com.nexusos.solicitacao.dto.SolicitacaoDetalheResponse;
import com.nexusos.solicitacao.dto.SolicitacaoMensagemRequest;
import com.nexusos.solicitacao.dto.SolicitacaoRejeicaoRequest;
import com.nexusos.solicitacao.dto.SolicitacaoResponsavelRequest;
import com.nexusos.solicitacao.dto.SolicitacaoResumoResponse;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

@RestController
@RequestMapping("/api/v1/solicitacoes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SolicitacaoController {
    private final SolicitacaoService service;
    private final SolicitacaoAnexoService anexoService;

    @GetMapping
    public ResponseEntity<List<SolicitacaoResumoResponse>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/resumo")
    public ResponseEntity<SolicitacaoContagemResponse> resumo() {
        return ResponseEntity.ok(service.contarPendentes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SolicitacaoDetalheResponse> buscar(@PathVariable UUID id) {
        return ResponseEntity.ok(service.buscar(id));
    }

    @PatchMapping("/{id}/assumir")
    public ResponseEntity<SolicitacaoDetalheResponse> assumir(@PathVariable UUID id) {
        return ResponseEntity.ok(service.assumir(id));
    }

    @PatchMapping("/{id}/responsavel")
    public ResponseEntity<SolicitacaoDetalheResponse> atualizarResponsavel(@PathVariable UUID id,
            @RequestBody SolicitacaoResponsavelRequest request) {
        return ResponseEntity.ok(service.atualizarResponsavel(id, request.responsavelId()));
    }

    @PostMapping("/{id}/esclarecimentos")
    public ResponseEntity<SolicitacaoDetalheResponse> solicitarEsclarecimentos(@PathVariable UUID id,
            @Valid @RequestBody SolicitacaoMensagemRequest request) {
        return ResponseEntity.ok(service.solicitarEsclarecimentos(id, request.mensagem()));
    }

    @PostMapping("/{id}/rejeitar")
    public ResponseEntity<SolicitacaoDetalheResponse> rejeitar(@PathVariable UUID id,
            @Valid @RequestBody SolicitacaoRejeicaoRequest request) {
        return ResponseEntity.ok(service.rejeitar(id, request));
    }

    @PostMapping("/{id}/converter")
    public ResponseEntity<SolicitacaoDetalheResponse> converter(@PathVariable UUID id,
            @Valid @RequestBody SolicitacaoConversaoRequest request) {
        return ResponseEntity.ok(service.converter(id, request));
    }

    @GetMapping("/{id}/anexos/{anexoId}/arquivo")
    public ResponseEntity<org.springframework.core.io.Resource> baixarAnexo(@PathVariable UUID id,
            @PathVariable UUID anexoId) {
        service.buscarEntidade(id);
        var download = anexoService.baixar(id, anexoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.tipoArquivo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''"
                        + UriUtils.encode(download.nomeArquivo(), StandardCharsets.UTF_8))
                .body(download.recurso());
    }
}
