package com.nexusos.whatsapp;

import com.nexusos.cliente.ClienteService;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.notificacao.NotificacaoService;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappService {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    private final NotificacaoService notificacaoService;
    private final ClienteService clienteService;
    private final ConfiguracaoWhatsappService configuracaoWhatsappService;

    @Value("${nexusos.whatsapp.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public void enviarOrdemServicoAnalisada(OrdemServico os) {
        if (!deveEnviar(os)) {
            return;
        }

        enviar(os,
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

        enviar(os,
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

    private void enviar(OrdemServico os, String conteudo) {
        var telefone = os.getCliente().getTelefone();
        var configuracao = configuracaoWhatsappService.buscarParaEnvio();
        if (!configuracao.isHabilitado() || !configuracao.configurado()) {
            log.info("Envio de WhatsApp desabilitado. Mensagem para '{}' nao enviada.", telefone);
            return;
        }
        try {
            configuracaoWhatsappService.enviar(configuracao, telefone, conteudo);
        } catch (RuntimeException ex) {
            log.warn("Falha ao enviar WhatsApp para '{}': {}", telefone, ex.getClass().getSimpleName());
            notificacaoService.notificarFalhaIntegracao(os, "WhatsApp", "Falha no provedor de WhatsApp");
        }
    }

    private String linkPortalCliente(OrdemServico os) {
        var cliente = clienteService.garantirTokenAcessoValido(os.getCliente());
        return frontendBaseUrl.replaceAll("/+$", "") + "/portal/cliente/" + cliente.getTokenAcesso();
    }

    private String formatarValor(BigDecimal valor) {
        if (valor == null) {
            return "Nao informado";
        }

        return NumberFormat.getCurrencyInstance(PT_BR).format(valor);
    }

}
