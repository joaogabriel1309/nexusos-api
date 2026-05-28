package com.nexusos.whatsapp;

import com.nexusos.ordemservico.OrdemServico;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappService {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    @Value("${nexusos.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${nexusos.whatsapp.api-url:https://graph.facebook.com/v20.0}")
    private String apiUrl;

    @Value("${nexusos.whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${nexusos.whatsapp.access-token:}")
    private String accessToken;

    @Value("${nexusos.whatsapp.default-country-code:55}")
    private String defaultCountryCode;

    @Value("${nexusos.whatsapp.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public void enviarOrdemServicoAnalisada(OrdemServico os) {
        if (!deveEnviar(os)) {
            return;
        }

        enviar(os.getCliente().getTelefone(),
                """
                        Ola, %s.

                        Sua OS foi analisada no NexusOS.

                        OS n. %d - %s
                        Horas estimadas: %s
                        Valor estimado: %s

                        Analise:
                        %s

                        Acompanhe pelo portal:
                        %s
                        """.formatted(
                        os.getCliente().getNome(),
                        os.getCodigo(),
                        os.getTitulo(),
                        os.getEstimativaHoras() != null ? os.getEstimativaHoras() : "Nao informado",
                        formatarValor(os.getValorTotalEstimado()),
                        os.getEntendimento() != null ? os.getEntendimento() : "Nao informado",
                        linkPortalCliente(os)
                ));
    }

    public void enviarOrdemServicoFinalizada(OrdemServico os) {
        if (!deveEnviar(os)) {
            return;
        }

        enviar(os.getCliente().getTelefone(),
                """
                        Ola, %s.

                        Sua OS foi finalizada no NexusOS.

                        OS n. %d - %s
                        Valor: %s

                        O que foi feito:
                        %s

                        Detalhes no portal:
                        %s
                        """.formatted(
                        os.getCliente().getNome(),
                        os.getCodigo(),
                        os.getTitulo(),
                        formatarValor(os.getValorTotalEstimado()),
                        os.getDescricaoFinalizacao() != null ? os.getDescricaoFinalizacao() : "Nao informado",
                        linkPortalCliente(os)
                ));
    }

    private boolean deveEnviar(OrdemServico os) {
        return os.getCliente() != null
                && os.getCliente().isEnviarWhatsapp()
                && os.getCliente().getTelefone() != null
                && !os.getCliente().getTelefone().isBlank();
    }

    private void enviar(String telefone, String conteudo) {
        if (!whatsappEnabled) {
            log.info("Envio de WhatsApp desabilitado. Mensagem para '{}' nao enviada.", telefone);
            return;
        }

        if (accessToken == null || accessToken.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
            log.warn("WhatsApp Cloud API nao configurado. Mensagem para '{}' nao enviada.", telefone);
            return;
        }

        var destino = normalizarTelefone(telefone);
        if (destino.isBlank()) {
            log.warn("Telefone do cliente invalido para envio de WhatsApp: '{}'.", telefone);
            return;
        }

        try {
            restClient().post()
                    .uri("/{phoneNumberId}/messages", phoneNumberId)
                    .header("Authorization", "Bearer " + accessToken)
                    .body(new WhatsappMessageRequest(
                            "whatsapp",
                            destino,
                            "text",
                            new WhatsappTextRequest(false, conteudo)
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            log.warn("WhatsApp recusou a mensagem para '{}': {}", destino, ex.getResponseBodyAsString());
        } catch (RestClientException ex) {
            log.warn("Falha ao comunicar com WhatsApp ao enviar mensagem para '{}': {}", destino, ex.getMessage());
        }
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl(apiUrl)
                .build();
    }

    private String normalizarTelefone(String telefone) {
        var digitos = telefone.replaceAll("\\D", "");
        if (digitos.isBlank()) {
            return "";
        }

        if ((digitos.length() == 10 || digitos.length() == 11) && defaultCountryCode != null && !defaultCountryCode.isBlank()) {
            return defaultCountryCode.replaceAll("\\D", "") + digitos;
        }

        return digitos;
    }

    private String linkPortalCliente(OrdemServico os) {
        return frontendBaseUrl.replaceAll("/+$", "") + "/portal/cliente/" + os.getCliente().getTokenAcesso();
    }

    private String formatarValor(BigDecimal valor) {
        if (valor == null) {
            return "Nao informado";
        }

        return NumberFormat.getCurrencyInstance(PT_BR).format(valor);
    }

    private record WhatsappMessageRequest(
            String messaging_product,
            String to,
            String type,
            WhatsappTextRequest text
    ) {
    }

    private record WhatsappTextRequest(
            boolean preview_url,
            String body
    ) {
    }
}
