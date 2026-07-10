package com.nexusos.email;

import com.nexusos.cliente.ClienteService;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.notificacao.NotificacaoService;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final NotificacaoService notificacaoService;
    private final ClienteService clienteService;

    @Value("${nexusos.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${nexusos.email.from:}")
    private String emailFrom;

    @Value("${nexusos.email.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public void enviarOrdemServicoAnalisada(OrdemServico os) {
        if (!deveEnviar(os)) {
            return;
        }

        enviar(os,
                os.getCliente().getEmail(),
                "OS analisada - NexusOS",
                """
                        Ola, %s.

                        A sua Ordem de Servico foi analisada no NexusOS.

                        OS n. %d - %s
                        Status: %s
                        Horas estimadas: %s
                        Valor estimado: %s

                        Texto da analise:
                        %s

                        Voce pode acompanhar pelo portal do cliente:
                        %s
                        """.formatted(
                        os.getCliente().getNome(),
                        os.getCodigo(),
                        os.getTitulo(),
                        os.getStatus(),
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
                os.getCliente().getEmail(),
                "OS finalizada - NexusOS",
                """
                        Ola, %s.

                        A sua Ordem de Servico foi finalizada.

                        OS n. %d - %s
                        Valor: %s

                        O que foi feito:
                        %s

                        Voce pode consultar os detalhes pelo portal do cliente:
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
                && os.getCliente().isEnviarEmail()
                && os.getCliente().getEmail() != null
                && !os.getCliente().getEmail().isBlank();
    }

    private void enviar(OrdemServico os, String destinatario, String assunto, String conteudo) {
        if (!emailEnabled) {
            log.info("Envio de e-mail desabilitado. Assunto '{}' para '{}' nao enviado.", assunto, destinatario);
            return;
        }

        var mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("JavaMailSender nao configurado. Assunto '{}' para '{}' nao enviado.", assunto, destinatario);
            notificacaoService.notificarFalhaIntegracao(os, "e-mail", "JavaMailSender nao configurado");
            return;
        }

        try {
            var mensagem = new SimpleMailMessage();
            if (emailFrom != null && !emailFrom.isBlank()) {
                mensagem.setFrom(emailFrom);
            }
            mensagem.setTo(destinatario);
            mensagem.setSubject(assunto);
            mensagem.setText(conteudo);
            mailSender.send(mensagem);
        } catch (MailException ex) {
            log.warn("Falha ao enviar e-mail '{}' para '{}': {}", assunto, destinatario, ex.getMessage());
            notificacaoService.notificarFalhaIntegracao(os, "e-mail", ex.getMessage());
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
