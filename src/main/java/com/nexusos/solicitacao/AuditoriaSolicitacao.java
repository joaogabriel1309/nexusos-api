package com.nexusos.solicitacao;

import com.nexusos.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "auditoria_solicitacoes")
public class AuditoriaSolicitacao {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitacao_id", nullable = false)
    private Solicitacao solicitacao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrigemSolicitacao origem;

    @Column(nullable = false)
    private String tipoEvento;

    @Column(nullable = false, columnDefinition = "text")
    private String descricao;

    @Enumerated(EnumType.STRING)
    private StatusSolicitacao statusAnterior;

    @Enumerated(EnumType.STRING)
    private StatusSolicitacao statusNovo;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        criadoEm = OffsetDateTime.now();
    }
}
