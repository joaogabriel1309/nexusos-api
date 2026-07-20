package com.nexusos.whatsapp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "configuracoes_whatsapp")
public class ConfiguracaoWhatsapp {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Id
    private UUID id;
    @Column(nullable = false)
    private boolean habilitado;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WhatsappProvider provedor;
    @Column(name = "credencial_cifrada", columnDefinition = "TEXT")
    private String credencialCifrada;
    @Column(name = "numero_padrao", length = 32)
    private String numeroPadrao;
    @Column(name = "meta_phone_number_id", length = 100)
    private String metaPhoneNumberId;
    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @PreUpdate
    void preUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }

    public boolean configurado() {
        return provedor != null && preenchido(credencialCifrada) && preenchido(numeroPadrao)
                && (provedor != WhatsappProvider.META || preenchido(metaPhoneNumberId));
    }

    private boolean preenchido(String valor) {
        return valor != null && !valor.isBlank();
    }
}

