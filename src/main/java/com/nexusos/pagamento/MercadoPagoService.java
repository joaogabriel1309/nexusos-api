package com.nexusos.pagamento;

import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.pagamento.dto.PagamentoCheckoutResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
public class MercadoPagoService {

    private final OrdemServicoRepository ordemServicoRepository;

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
        } catch (RestClientException ex) {
            throw new RegraNegocioException("Nao foi possivel iniciar o pagamento no Mercado Pago.");
        }
    }

    @Transactional
    public void processarNotificacaoPagamento(String paymentId) {
        if (paymentId == null || paymentId.isBlank()) {
            return;
        }

        try {
            var payment = restClient().get()
                    .uri("/v1/payments/{id}", paymentId)
                    .retrieve()
                    .body(MercadoPagoPaymentResponse.class);

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

    private MercadoPagoPreferenceRequest criarPreferenceRequest(OrdemServico os, String tokenCliente) {
        var portalUrl = frontendBaseUrl + "/portal/cliente/" + tokenCliente;
        return new MercadoPagoPreferenceRequest(
                List.of(new MercadoPagoItemRequest(
                        "OS n. " + os.getCodigo() + " - " + os.getTitulo(),
                        1,
                        "BRL",
                        os.getValorTotalEstimado()
                )),
                new MercadoPagoPayerRequest(os.getCliente().getEmail(), os.getCliente().getNome()),
                Map.of(
                        "success", portalUrl + "?pagamento=sucesso",
                        "failure", portalUrl + "?pagamento=falha",
                        "pending", portalUrl + "?pagamento=pendente"
                ),
                apiBaseUrl + "/api/v1/pagamentos/mercado-pago/webhook",
                os.getId().toString(),
                "approved"
        );
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader("Authorization", "Bearer " + accessToken)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

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
