package com.nexusos.whatsapp;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.integration.ExternalHttpRequestFactory;
import com.nexusos.whatsapp.dto.ConfiguracaoWhatsappRequest;
import com.nexusos.whatsapp.dto.ConfiguracaoWhatsappResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
public class ConfiguracaoWhatsappService {
    private final ConfiguracaoWhatsappRepository repository;
    private final WhatsappCredentialCipher credentialCipher;

    @Value("${nexusos.whatsapp.api-url:https://graph.facebook.com/v20.0}")
    private String metaApiUrl;
    @Value("${nexusos.whatsapp.callmebot-api-url:https://api.callmebot.com}")
    private String callmebotApiUrl;
    @Value("${nexusos.whatsapp.default-country-code:55}")
    private String defaultCountryCode;

    @Transactional(readOnly = true)
    public ConfiguracaoWhatsappResponse buscar() {
        return ConfiguracaoWhatsappResponse.from(buscarEntidade());
    }

    @Transactional
    public ConfiguracaoWhatsappResponse atualizar(ConfiguracaoWhatsappRequest request) {
        var configuracao = buscarEntidade();
        configuracao.setHabilitado(request.habilitado());
        configuracao.setProvedor(request.provedor());
        configuracao.setNumeroPadrao(normalizar(request.numeroPadrao()));
        configuracao.setMetaPhoneNumberId(normalizar(request.metaPhoneNumberId()));
        if (request.credencial() != null && !request.credencial().isBlank()) {
            configuracao.setCredencialCifrada(credentialCipher.encrypt(request.credencial().trim()));
        }
        if (configuracao.isHabilitado() && !configuracao.configurado()) {
            throw new RegraNegocioException("Preencha todos os campos obrigatorios antes de habilitar o WhatsApp.");
        }
        return ConfiguracaoWhatsappResponse.from(repository.save(configuracao));
    }

    @Transactional(readOnly = true)
    public void enviarTeste() {
        var configuracao = buscarEntidade();
        if (!configuracao.configurado()) {
            throw new RegraNegocioException("Configure todos os campos do WhatsApp antes de enviar um teste.");
        }
        enviar(configuracao, configuracao.getNumeroPadrao(),
                "Teste de WhatsApp do NexusOS. A integracao esta funcionando.");
    }

    @Transactional(readOnly = true)
    public ConfiguracaoWhatsapp buscarParaEnvio() {
        return buscarEntidade();
    }

    public void enviar(ConfiguracaoWhatsapp configuracao, String telefone, String conteudo) {
        if (!configuracao.configurado()) {
            throw new RegraNegocioException("Configuracao de WhatsApp incompleta.");
        }
        var destino = normalizarTelefone(telefone, configuracao.getProvedor() == WhatsappProvider.CALLMEBOT);
        if (destino.isBlank()) {
            throw new RegraNegocioException("Numero de WhatsApp invalido.");
        }
        var credencial = credentialCipher.decrypt(configuracao.getCredencialCifrada());
        try {
            if (configuracao.getProvedor() == WhatsappProvider.CALLMEBOT) {
                restClient(callmebotApiUrl).get()
                        .uri(builder -> builder.path("/whatsapp.php").queryParam("phone", destino)
                                .queryParam("text", conteudo).queryParam("apikey", credencial).build())
                        .retrieve().toBodilessEntity();
            } else {
                restClient(metaApiUrl).post()
                        .uri("/{phoneNumberId}/messages", configuracao.getMetaPhoneNumberId())
                        .header("Authorization", "Bearer " + credencial)
                        .body(new WhatsappMessageRequest("whatsapp", destino, "text",
                                new WhatsappTextRequest(false, conteudo)))
                        .retrieve().toBodilessEntity();
            }
        } catch (RestClientException ex) {
            throw new RegraNegocioException("Falha ao enviar WhatsApp. Verifique o provedor e a credencial.");
        }
    }

    private ConfiguracaoWhatsapp buscarEntidade() {
        return repository.findById(ConfiguracaoWhatsapp.ID)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Configuracao de WhatsApp nao encontrada."));
    }

    private String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private RestClient restClient(String baseUrl) {
        return RestClient.builder()
                .requestFactory(ExternalHttpRequestFactory.create())
                .baseUrl(baseUrl)
                .build();
    }

    private String normalizarTelefone(String telefone, boolean incluirMais) {
        var digitos = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if ((digitos.length() == 10 || digitos.length() == 11) && defaultCountryCode != null) {
            digitos = defaultCountryCode.replaceAll("\\D", "") + digitos;
        }
        return digitos.isBlank() ? "" : incluirMais ? "+" + digitos : digitos;
    }

    private record WhatsappMessageRequest(String messaging_product, String to, String type, WhatsappTextRequest text) {}
    private record WhatsappTextRequest(boolean preview_url, String body) {}
}
