package com.nexusos.notificacao;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.solicitacao.Solicitacao;
import com.nexusos.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
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
@Table(name = "notificacoes")
public class Notificacao {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordem_servico_id")
    private OrdemServico ordemServico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitacao_id")
    private Solicitacao solicitacao;

    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String mensagem;

    @Column(nullable = false)
    private boolean lida;

    private LocalDate referenciaData;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    private OffsetDateTime lidaEm;

    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        criadoEm = OffsetDateTime.now();
    }
}
