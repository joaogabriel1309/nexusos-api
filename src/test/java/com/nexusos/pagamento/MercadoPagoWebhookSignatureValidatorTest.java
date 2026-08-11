package com.nexusos.pagamento;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class MercadoPagoWebhookSignatureValidatorTest {

    private static final String SECRET = "segredo-de-webhook-para-testes";

    @Test
    void aceitaAssinaturaHmacValida() throws Exception {
        var validator = new MercadoPagoWebhookSignatureValidator(SECRET);
        var dataId = "123456";
        var requestId = "request-123";
        var timestamp = "1704908010";
        var assinatura = assinar("id:" + dataId + ";request-id:" + requestId + ";ts:" + timestamp + ";");

        assertThatCode(() -> validator.validar("ts=" + timestamp + ",v1=" + assinatura, requestId, dataId))
                .doesNotThrowAnyException();
    }

    @Test
    void rejeitaAssinaturaForjada() {
        var validator = new MercadoPagoWebhookSignatureValidator(SECRET);

        assertThatThrownBy(() -> validator.validar("ts=1704908010,v1=" + "0".repeat(64),
                "request-123", "123456"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401");
    }

    @Test
    void bloqueiaWebhookSemSegredoConfigurado() {
        var validator = new MercadoPagoWebhookSignatureValidator(" ");

        assertThatThrownBy(() -> validator.validar("ts=1,v1=" + "0".repeat(64), "request", "1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }

    private String assinar(String manifesto) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(manifesto.getBytes(StandardCharsets.UTF_8)));
    }
}
