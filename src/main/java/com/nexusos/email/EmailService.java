package com.nexusos.email;

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
public class EmailService {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    private final ConfiguracaoEmailService configuracaoEmailService;
    private final NotificacaoService notificacaoService;
    private final ClienteService clienteService;

    @Value("${nexusos.email.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public void enviarOrdemServicoAnalisada(OrdemServico os) {
        if (!deveEnviar(os)) {
            return;
        }

        enviar(os,
                os.getCliente().getEmail(),
                "Ticket analisado - NexusOS",
                """
                        Ola, %s.

                        A sua Ticket foi analisada no NexusOS.

                        Ticket n. %d - %s
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
                "Ticket finalizado - NexusOS",
                """
                        Ola, %s.

                        A sua Ticket foi finalizada.

                        Ticket n. %d - %s
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

    public void enviarRecuperacaoSenha(String destinatario, String token) {
        var link = frontendBaseUrl.replaceAll("/+$", "") + "/redefinir-senha?token=" + token;
        enviarGenerico(destinatario, "Recuperacao de senha - NexusOS", """
                Ola.

                Recebemos uma solicitacao para redefinir sua senha no NexusOS.
                Use o link abaixo em ate 60 minutos:

                %s

                Se voce nao fez esta solicitacao, ignore esta mensagem.
                """.formatted(link));
    }

    private boolean deveEnviar(OrdemServico os) {
        return os.getCliente() != null
                && os.getCliente().isEnviarEmail()
                && os.getCliente().getEmail() != null
                && !os.getCliente().getEmail().isBlank();
    }

    private void enviar(OrdemServico os, String destinatario, String assunto, String conteudo) {
        var configuracao = configuracaoEmailService.buscarParaEnvio();
        if (!configuracao.isHabilitado() || !configuracao.configurado()) {
            log.info("Envio de e-mail desabilitado. Mensagem nao enviada.");
            return;
        }
        try {
            configuracaoEmailService.enviar(configuracao, destinatario, assunto, conteudo);
        } catch (RuntimeException ex) {
            log.warn("Falha ao enviar e-mail: {}", ex.getClass().getSimpleName());
            notificacaoService.notificarFalhaIntegracao(os, "e-mail", "Falha no envio SMTP");
        }
    }

    private void enviarGenerico(String destinatario, String assunto, String conteudo) {
        var configuracao = configuracaoEmailService.buscarParaEnvio();
        if (!configuracao.isHabilitado() || !configuracao.configurado()) {
            log.info("Envio de e-mail de recuperacao desabilitado.");
            return;
        }
        try {
            configuracaoEmailService.enviar(configuracao, destinatario, assunto, conteudo);
        } catch (RuntimeException ex) {
            log.warn("Falha ao enviar e-mail de recuperacao de senha: {}", ex.getClass().getSimpleName());
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
