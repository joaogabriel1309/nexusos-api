package com.nexusos.pagamento;

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

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "configuracoes_pagamento")
public class ConfiguracaoPagamento {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000004");
    @Id private UUID id;
    @Column(name = "mercado_pago_token_cifrado", columnDefinition = "TEXT") private String mercadoPagoTokenCifrado;
    @Column(name = "mercado_pago_chave_publica", length = 255) private String mercadoPagoChavePublica;
    @Column(name = "expiracao_link_minutos", nullable = false) private Integer expiracaoLinkMinutos;
    @Column(name = "cobrar_automaticamente_os_finalizada", nullable = false) private Boolean cobrarAutomaticamenteOsFinalizada;
    @Column(name = "permitir_os_sem_cobranca", nullable = false) private Boolean permitirOsSemCobranca;
    @Column(name = "atualizado_em", nullable = false) private OffsetDateTime atualizadoEm;
    @PreUpdate void preUpdate() { atualizadoEm = OffsetDateTime.now(); }
}

