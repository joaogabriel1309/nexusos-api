package com.nexusos.pagamento;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MercadoPagoWebhookSignatureValidator {

    private static final int TAMANHO_MAXIMO_HEADER = 512;
    private final String secret;

    public MercadoPagoWebhookSignatureValidator(
            @Value("${nexusos.mercado-pago.webhook-secret:}") String secret) {
        this.secret = secret == null ? "" : secret.trim();
    }

    public void validar(String xSignature, String xRequestId, String dataId) {
        if (secret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Webhook de pagamento nao configurado.");
        }
        if (vazioOuExcessivo(xSignature, TAMANHO_MAXIMO_HEADER)
                || vazioOuExcessivo(xRequestId, 200)
                || vazioOuExcessivo(dataId, 120)) {
            throw assinaturaInvalida();
        }

        String timestamp = null;
        String assinaturaRecebida = null;
        for (var parte : xSignature.split(",")) {
            var chaveValor = parte.trim().split("=", 2);
            if (chaveValor.length != 2) {
                continue;
            }
            if ("ts".equals(chaveValor[0])) {
                timestamp = chaveValor[1];
            } else if ("v1".equals(chaveValor[0])) {
                assinaturaRecebida = chaveValor[1];
            }
        }

        if (vazioOuExcessivo(timestamp, 32) || assinaturaRecebida == null
                || !assinaturaRecebida.matches("^[0-9a-fA-F]{64}$")) {
            throw assinaturaInvalida();
        }

        var manifesto = "id:" + dataId + ";request-id:" + xRequestId + ";ts:" + timestamp + ";";
        var assinaturaCalculada = calcularHmac(manifesto);
        if (!MessageDigest.isEqual(assinaturaCalculada,
                assinaturaRecebida.toLowerCase().getBytes(StandardCharsets.US_ASCII))) {
            throw assinaturaInvalida();
        }
    }

    private byte[] calcularHmac(String manifesto) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifesto.getBytes(StandardCharsets.UTF_8)))
                    .getBytes(StandardCharsets.US_ASCII);
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            throw new IllegalStateException("Nao foi possivel validar a assinatura do webhook.", ex);
        }
    }

    private boolean vazioOuExcessivo(String valor, int limite) {
        return valor == null || valor.isBlank() || valor.length() > limite;
    }

    private ResponseStatusException assinaturaInvalida() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Assinatura do webhook invalida.");
    }
}
