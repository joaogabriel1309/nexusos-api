package com.nexusos.portalcliente;

import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.solicitacao.SolicitacaoAnexoService;
import com.nexusos.solicitacao.SolicitacaoPortalRateLimitService;
import com.nexusos.solicitacao.SolicitacaoService;
import com.nexusos.solicitacao.dto.SolicitacaoDetalheResponse;
import com.nexusos.solicitacao.dto.SolicitacaoResumoResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

@Validated
@RestController
@RequestMapping("/api/v1/portal/clientes/{token}/solicitacoes")
@RequiredArgsConstructor
@PreAuthorize("permitAll()")
public class PortalSolicitacaoController {
    private final SolicitacaoService service;
    private final SolicitacaoAnexoService anexoService;
    private final SolicitacaoPortalRateLimitService rateLimitService;

    @GetMapping
    public ResponseEntity<List<SolicitacaoResumoResponse>> listar(@PathVariable String token) {
        return ResponseEntity.ok(service.listarPortal(token));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SolicitacaoDetalheResponse> buscar(@PathVariable String token, @PathVariable UUID id) {
        return ResponseEntity.ok(service.buscarPortal(token, id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SolicitacaoDetalheResponse> criar(@PathVariable String token,
            @RequestParam @NotBlank @Size(max = 180) String titulo,
            @RequestParam @NotBlank @Size(max = 10000) String descricao,
            @RequestParam(required = false) PrioridadeOS prioridade,
            @RequestParam(required = false, name = "arquivos") List<MultipartFile> arquivos,
            HttpServletRequest request) {
        rateLimitService.registrarCriacao(token, ipCliente(request));
        return ResponseEntity.ok(service.criarPortal(token, titulo, descricao, prioridade, arquivos));
    }

    @PostMapping(value = "/{id}/respostas", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SolicitacaoDetalheResponse> responder(@PathVariable String token,
            @PathVariable UUID id,
            @RequestParam @NotBlank @Size(max = 5000) String mensagem,
            @RequestParam(required = false, name = "arquivos") List<MultipartFile> arquivos,
            HttpServletRequest request) {
        rateLimitService.registrarResposta(token, ipCliente(request));
        return ResponseEntity.ok(service.responderPortal(token, id, mensagem, arquivos));
    }

    @GetMapping("/{id}/anexos/{anexoId}/arquivo")
    public ResponseEntity<org.springframework.core.io.Resource> baixarAnexo(@PathVariable String token,
            @PathVariable UUID id, @PathVariable UUID anexoId) {
        service.validarAcessoPortal(token, id);
        var download = anexoService.baixar(id, anexoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.tipoArquivo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''"
                        + UriUtils.encode(download.nomeArquivo(), StandardCharsets.UTF_8))
                .body(download.recurso());
    }

    private String ipCliente(HttpServletRequest request) {
        var cloudflare = request.getHeader("CF-Connecting-IP");
        if (cloudflare != null && !cloudflare.isBlank()) {
            return cloudflare.trim();
        }
        var encaminhado = request.getHeader("X-Forwarded-For");
        if (encaminhado != null && !encaminhado.isBlank()) {
            return encaminhado.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
