package com.nexusos.solicitacao;

import com.nexusos.cliente.Cliente;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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
@Table(name = "solicitacoes")
public class Solicitacao {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true, updatable = false)
    private Long codigo;

    @Column(nullable = false, length = 180)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String descricao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @Enumerated(EnumType.STRING)
    private PrioridadeOS prioridade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusSolicitacao status;

    @Enumerated(EnumType.STRING)
    private MotivoRejeicaoSolicitacao motivoRejeicao;

    @Column(columnDefinition = "text")
    private String detalheRejeicao;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordem_servico_id", unique = true)
    private OrdemServico ordemServico;

    @Version
    private long versao;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(nullable = false)
    private OffsetDateTime atualizadoEm;

    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        status = status == null ? StatusSolicitacao.NOVA : status;
        criadoEm = OffsetDateTime.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void preUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }
}
