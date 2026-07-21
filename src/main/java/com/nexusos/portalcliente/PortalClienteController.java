package com.nexusos.portalcliente;

import com.nexusos.portalcliente.dto.PortalAprovacaoRequest;
import com.nexusos.portalcliente.dto.PortalClienteResponse;
import com.nexusos.portalcliente.dto.PortalOrdemServicoResponse;
import com.nexusos.portalcliente.dto.PortalPagamentoConfirmacaoRequest;
import com.nexusos.portalcliente.dto.PortalReprovacaoRequest;
import com.nexusos.pagamento.dto.PagamentoCheckoutResponse;
import com.nexusos.pagamento.dto.PagamentoPixResponse;
import com.nexusos.anexo.AnexoService;
import com.nexusos.anexo.dto.AnexoResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.web.util.UriUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/portal/clientes/{token}")
@RequiredArgsConstructor
@PreAuthorize("permitAll()") // A autorizacao do portal e feita pelo token do cliente e pelo vinculo da OS.
public class PortalClienteController {

    private final PortalClienteService portalClienteService;
    private final AnexoService anexoService;

    @Operation(summary = "Lista OS do cliente pelo token publico")
    @GetMapping("/ordens-servico")
    public ResponseEntity<PortalClienteResponse> listarOrdens(@PathVariable String token) {
        return ResponseEntity.ok(portalClienteService.listarOrdens(token));
    }

    @Operation(summary = "Aprova OS pelo portal do cliente")
    @PatchMapping("/ordens-servico/{ordemServicoId}/aprovar")
    public ResponseEntity<PortalOrdemServicoResponse> aprovar(@PathVariable String token,
            @PathVariable UUID ordemServicoId,
            @RequestBody(required = false) PortalAprovacaoRequest request) {
        return ResponseEntity.ok(portalClienteService.aprovar(token, ordemServicoId,
                request != null ? request.observacao() : null));
    }

    @Operation(summary = "Reprova OS pelo portal do cliente")
    @PatchMapping("/ordens-servico/{ordemServicoId}/reprovar")
    public ResponseEntity<PortalOrdemServicoResponse> reprovar(@PathVariable String token,
            @PathVariable UUID ordemServicoId,
            @RequestBody @Valid PortalReprovacaoRequest request) {
        return ResponseEntity.ok(portalClienteService.reprovar(token, ordemServicoId, request.observacao()));
    }

    @Operation(summary = "Inicia pagamento da OS no Mercado Pago")
    @PostMapping("/ordens-servico/{ordemServicoId}/pagamento")
    public ResponseEntity<PagamentoCheckoutResponse> iniciarPagamento(@PathVariable String token,
            @PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(portalClienteService.iniciarPagamento(token, ordemServicoId));
    }

    @Operation(summary = "Gera pagamento Pix da OS no Mercado Pago")
    @PostMapping("/ordens-servico/{ordemServicoId}/pagamento/pix")
    public ResponseEntity<PagamentoPixResponse> gerarPix(@PathVariable String token,
            @PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(portalClienteService.gerarPix(token, ordemServicoId));
    }

    @Operation(summary = "Confirma pagamento da OS pelo retorno do Mercado Pago")
    @PostMapping("/ordens-servico/{ordemServicoId}/pagamento/confirmar")
    public ResponseEntity<PortalOrdemServicoResponse> confirmarPagamento(@PathVariable String token,
            @PathVariable UUID ordemServicoId,
            @RequestBody @Valid PortalPagamentoConfirmacaoRequest request) {
        return ResponseEntity.ok(portalClienteService.confirmarPagamento(token, ordemServicoId, request.paymentId()));
    }

    @Operation(summary = "Verifica pagamento aprovado da OS no Mercado Pago")
    @PostMapping("/ordens-servico/{ordemServicoId}/pagamento/verificar")
    public ResponseEntity<PortalOrdemServicoResponse> verificarPagamento(@PathVariable String token,
            @PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(portalClienteService.verificarPagamento(token, ordemServicoId));
    }

    @GetMapping("/ordens-servico/{ordemServicoId}/anexos")
    public ResponseEntity<List<AnexoResponse>> listarAnexos(@PathVariable String token,
            @PathVariable UUID ordemServicoId) {
        portalClienteService.validarAcesso(token, ordemServicoId);
        return ResponseEntity.ok(anexoService.listar(ordemServicoId));
    }

    @PostMapping(value = "/ordens-servico/{ordemServicoId}/anexos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnexoResponse> salvarAnexo(@PathVariable String token, @PathVariable UUID ordemServicoId,
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam(value = "descricao", required = false) String descricao) {
        portalClienteService.validarAcesso(token, ordemServicoId);
        return ResponseEntity.ok(anexoService.salvar(ordemServicoId, arquivo, descricao, true));
    }

    @GetMapping("/ordens-servico/{ordemServicoId}/anexos/{anexoId}/arquivo")
    public ResponseEntity<org.springframework.core.io.Resource> baixarAnexo(@PathVariable String token,
            @PathVariable UUID ordemServicoId, @PathVariable UUID anexoId) {
        portalClienteService.validarAcesso(token, ordemServicoId);
        var download = anexoService.baixar(ordemServicoId, anexoId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(download.tipoArquivo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" +
                        UriUtils.encode(download.nomeArquivo(), StandardCharsets.UTF_8))
                .body(download.recurso());
    }
}
