package com.nexusos.portalcliente;

import com.nexusos.portalcliente.dto.PortalAprovacaoRequest;
import com.nexusos.portalcliente.dto.PortalClienteResponse;
import com.nexusos.portalcliente.dto.PortalOrdemServicoResponse;
import com.nexusos.portalcliente.dto.PortalPagamentoConfirmacaoRequest;
import com.nexusos.pagamento.dto.PagamentoCheckoutResponse;
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

@RestController
@RequestMapping("/api/v1/portal/clientes/{token}")
@RequiredArgsConstructor
public class PortalClienteController {

    private final PortalClienteService portalClienteService;

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
            @RequestBody(required = false) PortalAprovacaoRequest request) {
        return ResponseEntity.ok(portalClienteService.reprovar(token, ordemServicoId,
                request != null ? request.observacao() : null));
    }

    @Operation(summary = "Inicia pagamento da OS no Mercado Pago")
    @PostMapping("/ordens-servico/{ordemServicoId}/pagamento")
    public ResponseEntity<PagamentoCheckoutResponse> iniciarPagamento(@PathVariable String token,
            @PathVariable UUID ordemServicoId) {
        return ResponseEntity.ok(portalClienteService.iniciarPagamento(token, ordemServicoId));
    }

    @Operation(summary = "Confirma pagamento da OS pelo retorno do Mercado Pago")
    @PostMapping("/ordens-servico/{ordemServicoId}/pagamento/confirmar")
    public ResponseEntity<PortalOrdemServicoResponse> confirmarPagamento(@PathVariable String token,
            @PathVariable UUID ordemServicoId,
            @RequestBody @Valid PortalPagamentoConfirmacaoRequest request) {
        return ResponseEntity.ok(portalClienteService.confirmarPagamento(token, ordemServicoId, request.paymentId()));
    }
}
