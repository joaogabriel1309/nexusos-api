package com.nexusos.pagamento;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.pagamento.dto.PagamentoCheckoutResponse;
import com.nexusos.pagamento.dto.PagamentoPixResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
    private final NotificacaoService notificacaoService;
    private final ConfiguracaoPagamentoService configuracaoPagamentoService;

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
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", detalhe);
            throw new RegraNegocioException("Mercado Pago recusou o pagamento: " + detalhe);
        } catch (RestClientException ex) {
            log.warn("Falha ao comunicar com Mercado Pago ao criar preferencia da OS {}: {}", os.getId(), ex.getMessage());
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", ex.getMessage());
            throw new RegraNegocioException("Nao foi possivel iniciar o pagamento no Mercado Pago.");
        }
    }

    @Transactional
    public PagamentoPixResponse criarPix(OrdemServico os) {
        validarPagamentoDisponivel(os);
        var request = criarPixRequest(os);

        try {
            var response = restClient().post()
                    .uri("/v1/payments")
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .body(request)
                    .retrieve()
                    .body(MercadoPagoPaymentResponse.class);

            if (response == null || response.id() == null || response.qrCode() == null) {
                throw new RegraNegocioException("Mercado Pago nao retornou QR Code Pix.");
            }

            os.setMercadoPagoPaymentId(response.id());
            ordemServicoRepository.save(os);
            return new PagamentoPixResponse(
                    response.id(),
                    response.status(),
                    response.qrCode(),
                    response.qrCodeBase64(),
                    response.ticketUrl()
            );
        } catch (RestClientResponseException ex) {
            var detalhe = extrairMensagemMercadoPago(ex);
            log.warn("Mercado Pago recusou a criacao do Pix da OS {}: {}", os.getId(), detalhe);
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", detalhe);
            throw new RegraNegocioException("Mercado Pago recusou o Pix: " + detalhe);
        } catch (RestClientException ex) {
            log.warn("Falha ao comunicar com Mercado Pago ao criar Pix da OS {}: {}", os.getId(), ex.getMessage());
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", ex.getMessage());
            throw new RegraNegocioException("Nao foi possivel gerar o Pix no Mercado Pago.");
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
            var detalhe = extrairMensagemMercadoPago(ex);
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", detalhe);
            throw new RegraNegocioException("Nao foi possivel consultar o pagamento: " + detalhe);
        } catch (RestClientException ex) {
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", ex.getMessage());
            throw new RegraNegocioException("Nao foi possivel consultar o pagamento no Mercado Pago.");
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

        var jaEstavaPaga = Boolean.TRUE.equals(os.getPaga());
        os.setMercadoPagoPaymentId(pagamento.id());
        os.setPaga(true);

        var salva = ordemServicoRepository.save(os);
        if (!jaEstavaPaga) {
            notificacaoService.notificarPagamento(salva, true);
        }
        return salva;
    }

    @Transactional
    public OrdemServico verificarPagamentoCliente(OrdemServico os) {
        var pagamento = buscarPagamentoAprovado(os);

        if (pagamento == null) {
            throw new RegraNegocioException("Pagamento aprovado ainda nao encontrado no Mercado Pago.");
        }

        var jaEstavaPaga = Boolean.TRUE.equals(os.getPaga());
        os.setMercadoPagoPaymentId(pagamento.id());
        os.setPaga(true);
        var salva = ordemServicoRepository.save(os);
        if (!jaEstavaPaga) {
            notificacaoService.notificarPagamento(salva, true);
        }
        return salva;
    }

    private void confirmarPagamento(String paymentId) {
        try {
            var payment = consultarPagamento(paymentId);

            if (payment == null || payment.externalReference() == null) {
                return;
            }

            ordemServicoRepository.findById(java.util.UUID.fromString(payment.externalReference()))
                    .ifPresent(os -> {
                        var jaEstavaPaga = Boolean.TRUE.equals(os.getPaga());
                        os.setMercadoPagoPaymentId(payment.id());
                        if ("approved".equalsIgnoreCase(payment.status()) && valorConfere(os, payment.transactionAmount())) {
                            os.setPaga(true);
                        }
                        var salva = ordemServicoRepository.save(os);
                        if (!jaEstavaPaga && Boolean.TRUE.equals(salva.getPaga())) {
                            notificacaoService.notificarPagamento(salva, true);
                        }
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

    private MercadoPagoPaymentResponse buscarPagamentoAprovado(OrdemServico os) {
        try {
            var response = restClient().get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/payments/search")
                            .queryParam("external_reference", os.getId())
                            .build())
                    .retrieve()
                    .body(MercadoPagoPaymentSearchResponse.class);

            if (response == null || response.results() == null) {
                return null;
            }

            return response.results().stream()
                    .filter(pagamento -> "approved".equalsIgnoreCase(pagamento.status()))
                    .filter(pagamento -> os.getId().toString().equals(pagamento.externalReference()))
                    .filter(pagamento -> valorConfere(os, pagamento.transactionAmount()))
                    .findFirst()
                    .orElse(null);
        } catch (RestClientResponseException ex) {
            var detalhe = extrairMensagemMercadoPago(ex);
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", detalhe);
            throw new RegraNegocioException("Nao foi possivel consultar pagamentos: " + detalhe);
        } catch (RestClientException ex) {
            notificacaoService.notificarFalhaIntegracao(os, "Mercado Pago", ex.getMessage());
            throw new RegraNegocioException("Nao foi possivel consultar pagamentos no Mercado Pago.");
        }
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
        var accessToken = configuracaoPagamentoService.buscarAccessToken();
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
                deveUsarAutoReturn() ? "approved" : null,
                OffsetDateTime.now().plusMinutes(configuracaoPagamentoService.buscarEntidade().getExpiracaoLinkMinutos())
        );
    }

    private MercadoPagoPixRequest criarPixRequest(OrdemServico os) {
        return new MercadoPagoPixRequest(
                os.getValorTotalEstimado(),
                "OS n. " + os.getCodigo() + " - " + os.getTitulo(),
                "pix",
                new MercadoPagoPixPayerRequest(os.getCliente().getEmail(), os.getCliente().getNome()),
                apiBaseUrl + "/api/v1/pagamentos/mercado-pago/webhook",
                os.getId().toString()
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
                .defaultHeader("Authorization", "Bearer " + configuracaoPagamentoService.buscarAccessToken())
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
            String auto_return,
            OffsetDateTime date_of_expiration
    ) {
    }

    private record MercadoPagoPixRequest(
            BigDecimal transaction_amount,
            String description,
            String payment_method_id,
            MercadoPagoPixPayerRequest payer,
            String notification_url,
            String external_reference
    ) {
    }

    private record MercadoPagoPixPayerRequest(
            String email,
            String first_name
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
            @com.fasterxml.jackson.annotation.JsonProperty("external_reference") String externalReference,
            @com.fasterxml.jackson.annotation.JsonProperty("point_of_interaction") MercadoPagoPointOfInteraction pointOfInteraction
    ) {
        String qrCode() {
            return pointOfInteraction != null && pointOfInteraction.transactionData() != null
                    ? pointOfInteraction.transactionData().qrCode()
                    : null;
        }

        String qrCodeBase64() {
            return pointOfInteraction != null && pointOfInteraction.transactionData() != null
                    ? pointOfInteraction.transactionData().qrCodeBase64()
                    : null;
        }

        String ticketUrl() {
            return pointOfInteraction != null && pointOfInteraction.transactionData() != null
                    ? pointOfInteraction.transactionData().ticketUrl()
                    : null;
        }
    }

    private record MercadoPagoPointOfInteraction(
            @com.fasterxml.jackson.annotation.JsonProperty("transaction_data") MercadoPagoTransactionData transactionData
    ) {
    }

    private record MercadoPagoTransactionData(
            @com.fasterxml.jackson.annotation.JsonProperty("qr_code") String qrCode,
            @com.fasterxml.jackson.annotation.JsonProperty("qr_code_base64") String qrCodeBase64,
            @com.fasterxml.jackson.annotation.JsonProperty("ticket_url") String ticketUrl
    ) {
    }

    private record MercadoPagoPaymentSearchResponse(
            List<MercadoPagoPaymentResponse> results
    ) {
    }
}
