package com.nexusos.pagamento;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.pagamento.dto.PagamentoCheckoutResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
@RequiredArgsConstructor
@Slf4j
public class MercadoPagoService {

    private final OrdemServicoRepository ordemServicoRepository;
    private final ObjectMapper objectMapper;

    @Value("${nexusos.mercado-pago.access-token:}")
    private String accessToken;

    @Value("${nexusos.mercado-pago.api-url:https://api.mercadopago.com}")
    private String apiUrl;

    @Value("${nexusos.mercado-pago.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Value("${nexusos.mercado-pago.api-base-url:http://localhost:8080}")
    private String apiBaseUrl;

    @Transactional
    public PagamentoCheckoutResponse criarCheckout(OrdemServico os, String tokenCliente) {
        validarPagamentoDisponivel(os);
        var request = criarPreferenceRequest(os, tokenCliente);

        try {
            var response = restClient().post()
                    .uri("/checkout/preferences")
                    .body(request)
                    .retrieve()
                    .body(MercadoPagoPreferenceResponse.class);

            if (response == null || response.id() == null || response.checkoutUrl() == null) {
                throw new RegraNegocioException("Mercado Pago nao retornou URL de pagamento.");
            }

            os.setMercadoPagoPreferenceId(response.id());
            ordemServicoRepository.save(os);
            return new PagamentoCheckoutResponse(response.id(), response.checkoutUrl());
        } catch (RestClientResponseException ex) {
            var detalhe = extrairMensagemMercadoPago(ex);
            log.warn("Mercado Pago recusou a criacao da preferencia da OS {}: {}", os.getId(), detalhe);
            throw new RegraNegocioException("Mercado Pago recusou o pagamento: " + detalhe);
        } catch (RestClientException ex) {
            log.warn("Falha ao comunicar com Mercado Pago ao criar preferencia da OS {}: {}", os.getId(), ex.getMessage());
            throw new RegraNegocioException("Nao foi possivel iniciar o pagamento no Mercado Pago.");
        }
    }

    @Transactional
    public void processarNotificacaoPagamento(String paymentId) {
        if (paymentId == null || paymentId.isBlank()) {
            return;
        }

        confirmarPagamento(paymentId);
    }

    @Transactional
    public OrdemServico confirmarPagamentoCliente(OrdemServico os, String paymentId) {
        MercadoPagoPaymentResponse pagamento;
        try {
            pagamento = consultarPagamento(paymentId);
        } catch (RestClientResponseException ex) {
            throw new RegraNegocioException("Nao foi possivel consultar o pagamento: " + extrairMensagemMercadoPago(ex));
        }

        if (pagamento == null) {
            throw new RegraNegocioException("Pagamento nao encontrado no Mercado Pago.");
        }

        if (!os.getId().toString().equals(pagamento.externalReference())) {
            throw new RegraNegocioException("Pagamento nao pertence a esta OS.");
        }

        if (!"approved".equalsIgnoreCase(pagamento.status())) {
            throw new RegraNegocioException("Pagamento ainda nao foi aprovado pelo Mercado Pago.");
        }

        if (!valorConfere(os, pagamento.transactionAmount())) {
            throw new RegraNegocioException("Valor pago nao confere com o valor da OS.");
        }

        os.setMercadoPagoPaymentId(pagamento.id());
        os.setPaga(true);

        return ordemServicoRepository.save(os);
    }

    private void confirmarPagamento(String paymentId) {
        try {
            var payment = consultarPagamento(paymentId);

            if (payment == null || payment.externalReference() == null) {
                return;
            }

            ordemServicoRepository.findById(java.util.UUID.fromString(payment.externalReference()))
                    .ifPresent(os -> {
                        os.setMercadoPagoPaymentId(payment.id());
                        if ("approved".equalsIgnoreCase(payment.status()) && valorConfere(os, payment.transactionAmount())) {
                            os.setPaga(true);
                        }
                        ordemServicoRepository.save(os);
                    });
        } catch (IllegalArgumentException | RestClientException ex) {
            // Notificacoes externas nao devem quebrar o processamento da aplicacao.
        }
    }

    private MercadoPagoPaymentResponse consultarPagamento(String paymentId) {
        if (paymentId == null || paymentId.isBlank()) {
            throw new RegraNegocioException("Pagamento nao informado.");
        }

        return restClient().get()
                .uri("/v1/payments/{id}", paymentId)
                .retrieve()
                .body(MercadoPagoPaymentResponse.class);
    }

    private void validarPagamentoDisponivel(OrdemServico os) {
        if (!mercadoPagoConfigurado()) {
            throw new RegraNegocioException("Mercado Pago nao configurado.");
        }
        if (Boolean.TRUE.equals(os.getPaga())) {
            throw new RegraNegocioException("OS ja esta marcada como paga.");
        }
        if (!Boolean.TRUE.equals(os.getCobrar())) {
            throw new RegraNegocioException("OS nao possui cobranca.");
        }
        if (os.getValorTotalEstimado() == null || os.getValorTotalEstimado().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RegraNegocioException("OS ainda nao possui valor para pagamento.");
        }
        if (os.getStatus() == StatusOS.RECEBIDA || os.getStatus() == StatusOS.EM_ANALISE) {
            throw new RegraNegocioException("OS ainda nao foi analisada para pagamento.");
        }
    }

    private boolean mercadoPagoConfigurado() {
        return accessToken != null && !accessToken.isBlank();
    }

    private boolean valorConfere(OrdemServico os, BigDecimal valorPago) {
        return valorPago != null
                && os.getValorTotalEstimado() != null
                && os.getValorTotalEstimado().compareTo(valorPago) == 0;
    }

    private String extrairMensagemMercadoPago(RestClientResponseException ex) {
        var body = ex.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return "HTTP " + ex.getStatusCode().value();
        }

        try {
            JsonNode json = objectMapper.readTree(body);
            var message = valorTexto(json, "message");
            var error = valorTexto(json, "error");
            var cause = json.path("cause");

            if (cause.isArray() && !cause.isEmpty()) {
                var primeiroErro = cause.get(0);
                var code = valorTexto(primeiroErro, "code");
                var description = valorTexto(primeiroErro, "description");
                if (description != null) {
                    return code != null ? code + " - " + description : description;
                }
            }

            if (message != null) {
                return message;
            }
            if (error != null) {
                return error;
            }
        } catch (Exception ignored) {
            return body.length() > 250 ? body.substring(0, 250) : body;
        }

        return "HTTP " + ex.getStatusCode().value();
    }

    private String valorTexto(JsonNode json, String campo) {
        var valor = json.path(campo);
        return valor.isTextual() && !valor.asText().isBlank() ? valor.asText() : null;
    }

    private MercadoPagoPreferenceRequest criarPreferenceRequest(OrdemServico os, String tokenCliente) {
        var portalUrl = frontendBaseUrl + "/portal/cliente/" + tokenCliente;
        var portalUrlComOs = portalUrl + "?os=" + os.getId();
        return new MercadoPagoPreferenceRequest(
                List.of(new MercadoPagoItemRequest(
                        "OS n. " + os.getCodigo() + " - " + os.getTitulo(),
                        1,
                        "BRL",
                        os.getValorTotalEstimado()
                )),
                new MercadoPagoPayerRequest(os.getCliente().getEmail(), os.getCliente().getNome()),
                Map.of(
                        "success", portalUrlComOs + "&pagamento=sucesso",
                        "failure", portalUrlComOs + "&pagamento=falha",
                        "pending", portalUrlComOs + "&pagamento=pendente"
                ),
                apiBaseUrl + "/api/v1/pagamentos/mercado-pago/webhook",
                os.getId().toString(),
                deveUsarAutoReturn() ? "approved" : null
        );
    }

    private boolean deveUsarAutoReturn() {
        return frontendBaseUrl != null
                && frontendBaseUrl.startsWith("https://")
                && !frontendBaseUrl.contains("localhost")
                && !frontendBaseUrl.contains("127.0.0.1");
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader("Authorization", "Bearer " + accessToken)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record MercadoPagoPreferenceRequest(
            List<MercadoPagoItemRequest> items,
            MercadoPagoPayerRequest payer,
            Map<String, String> back_urls,
            String notification_url,
            String external_reference,
            String auto_return
    ) {
    }

    private record MercadoPagoItemRequest(
            String title,
            Integer quantity,
            String currency_id,
            BigDecimal unit_price
    ) {
    }

    private record MercadoPagoPayerRequest(
            String email,
            String name
    ) {
    }

    private record MercadoPagoPreferenceResponse(
            String id,
            String init_point,
            String sandbox_init_point
    ) {
        String checkoutUrl() {
            return init_point != null ? init_point : sandbox_init_point;
        }
    }

    private record MercadoPagoPaymentResponse(
            String id,
            String status,
            @com.fasterxml.jackson.annotation.JsonProperty("transaction_amount") BigDecimal transactionAmount,
            @com.fasterxml.jackson.annotation.JsonProperty("external_reference") String externalReference
    ) {
    }
}
