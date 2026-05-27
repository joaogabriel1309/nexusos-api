package com.nexusos.pagamento;

import io.swagger.v3.oas.annotations.Operation;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pagamentos/mercado-pago")
@RequiredArgsConstructor
public class MercadoPagoWebhookController {

    private final MercadoPagoService mercadoPagoService;

    @Operation(summary = "Recebe notificacoes de pagamento do Mercado Pago")
    @PostMapping("/webhook")
    public ResponseEntity<Void> receberNotificacao(@RequestParam Map<String, String> params,
            @RequestBody(required = false) Map<String, Object> body) {
        var paymentId = extrairPaymentId(params, body);
        mercadoPagoService.processarNotificacaoPagamento(paymentId);
        return ResponseEntity.ok().build();
    }

    private String extrairPaymentId(Map<String, String> params, Map<String, Object> body) {
        var idParam = params.get("data.id");
        if (idParam != null && !idParam.isBlank()) {
            return idParam;
        }

        idParam = params.get("id");
        if (idParam != null && !idParam.isBlank()) {
            return idParam;
        }

        if (body == null) {
            return null;
        }

        var data = body.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            var id = dataMap.get("id");
            if (id != null) {
                return id.toString();
            }
        }

        var id = body.get("id");
        return id != null ? id.toString() : null;
    }
}
