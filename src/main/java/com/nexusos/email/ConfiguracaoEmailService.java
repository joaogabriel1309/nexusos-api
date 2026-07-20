package com.nexusos.email;

import com.nexusos.email.dto.ConfiguracaoEmailRequest;
import com.nexusos.email.dto.ConfiguracaoEmailResponse;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConfiguracaoEmailService {
    private final ConfiguracaoEmailRepository repository;
    private final SmtpPasswordCipher passwordCipher;
    private final SmtpSenderFactory senderFactory;

    @Transactional(readOnly = true)
    public ConfiguracaoEmailResponse buscar() {
        return ConfiguracaoEmailResponse.from(buscarEntidade());
    }

    @Transactional
    public ConfiguracaoEmailResponse atualizar(ConfiguracaoEmailRequest request) {
        var configuracao = buscarEntidade();
        configuracao.setHabilitado(request.habilitado());
        configuracao.setSmtpHost(normalizar(request.smtpHost()));
        configuracao.setSmtpPort(request.smtpPort());
        configuracao.setSmtpUsuario(normalizar(request.smtpUsuario()));
        configuracao.setEmailRemetente(normalizarEmail(request.emailRemetente()));
        if (request.smtpSenha() != null && !request.smtpSenha().isBlank()) {
            configuracao.setSmtpSenhaCifrada(passwordCipher.encrypt(request.smtpSenha()));
        }
        if (configuracao.isHabilitado() && !configuracao.configurado()) {
            throw new RegraNegocioException("Preencha todos os campos SMTP antes de habilitar o envio.");
        }
        return ConfiguracaoEmailResponse.from(repository.save(configuracao));
    }

    @Transactional(readOnly = true)
    public void enviarTeste(String destinatario) {
        var configuracao = buscarEntidade();
        if (!configuracao.configurado()) {
            throw new RegraNegocioException("Configure todos os campos SMTP antes de enviar um teste.");
        }
        enviar(configuracao, destinatario.trim().toLowerCase(Locale.ROOT), "Teste de e-mail - NexusOS",
                "Este e-mail confirma que a configuracao SMTP do NexusOS esta funcionando.");
    }

    @Transactional(readOnly = true)
    public ConfiguracaoEmail buscarParaEnvio() {
        return buscarEntidade();
    }

    public void enviar(ConfiguracaoEmail configuracao, String destinatario, String assunto, String conteudo) {
        try {
            var mensagem = new SimpleMailMessage();
            mensagem.setFrom(configuracao.getEmailRemetente());
            mensagem.setTo(destinatario);
            mensagem.setSubject(assunto);
            mensagem.setText(conteudo);
            senderFactory.create(configuracao, passwordCipher.decrypt(configuracao.getSmtpSenhaCifrada())).send(mensagem);
        } catch (MailException ex) {
            throw new RegraNegocioException("Falha ao enviar e-mail. Verifique a configuracao SMTP.");
        }
    }

    private ConfiguracaoEmail buscarEntidade() {
        return repository.findById(ConfiguracaoEmail.ID)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Configuracao de e-mail nao encontrada."));
    }

    private String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private String normalizarEmail(String valor) {
        var normalizado = normalizar(valor);
        return normalizado == null ? null : normalizado.toLowerCase(Locale.ROOT);
    }
}
