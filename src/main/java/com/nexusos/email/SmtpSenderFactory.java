package com.nexusos.email;

import java.util.Properties;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

@Component
public class SmtpSenderFactory {
    public JavaMailSender create(ConfiguracaoEmail configuracao, String senha) {
        var sender = new JavaMailSenderImpl();
        sender.setHost(configuracao.getSmtpHost());
        sender.setPort(configuracao.getSmtpPort());
        sender.setUsername(configuracao.getSmtpUsuario());
        sender.setPassword(senha);
        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        return sender;
    }
}
