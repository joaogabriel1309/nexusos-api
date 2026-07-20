package com.nexusos.email;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "configuracoes_email")
public class ConfiguracaoEmail {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Id
    private UUID id;
    @Column(nullable = false)
    private boolean habilitado;
    @Column(name = "smtp_host", length = 255)
    private String smtpHost;
    @Column(name = "smtp_port")
    private Integer smtpPort;
    @Column(name = "smtp_usuario", length = 255)
    private String smtpUsuario;
    @Column(name = "smtp_senha_cifrada", columnDefinition = "TEXT")
    private String smtpSenhaCifrada;
    @Column(name = "email_remetente", length = 255)
    private String emailRemetente;
    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @PreUpdate
    void preUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }

    public boolean configurado() {
        return preenchido(smtpHost) && smtpPort != null && preenchido(smtpUsuario)
                && preenchido(smtpSenhaCifrada) && preenchido(emailRemetente);
    }

    private boolean preenchido(String valor) {
        return valor != null && !valor.isBlank();
    }
}
