package com.nexusos.cliente;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "clientes")
public class Cliente {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String documento;

    @Column(nullable = false)
    private String email;

    private String telefone;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valorHora;

    @Column(nullable = false)
    private boolean ativo;

    @Column(nullable = false)
    private boolean enviarEmail;

    @Column(nullable = false)
    private boolean enviarWhatsapp;

    @Column(name = "whatsapp_api_key", length = 80)
    private String whatsappApiKey;

    @Column(name = "token_acesso", nullable = false, unique = true, length = 80)
    private String tokenAcesso;

    @Column(name = "token_acesso_expira_em", nullable = false)
    private OffsetDateTime tokenAcessoExpiraEm;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(nullable = false)
    private OffsetDateTime atualizadoEm;

    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        ativo = true;
        enviarEmail = Boolean.TRUE.equals(enviarEmail);
        enviarWhatsapp = Boolean.TRUE.equals(enviarWhatsapp);
        valorHora = valorHora == null ? BigDecimal.ZERO : valorHora;
        tokenAcesso = tokenAcesso == null
                ? UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "")
                : tokenAcesso;
        tokenAcessoExpiraEm = tokenAcessoExpiraEm == null ? OffsetDateTime.now().plusDays(90) : tokenAcessoExpiraEm;
        criadoEm = OffsetDateTime.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void preUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }
}
