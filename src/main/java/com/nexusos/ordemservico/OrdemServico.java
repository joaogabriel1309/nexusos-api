package com.nexusos.ordemservico;

import com.nexusos.cliente.Cliente;
import com.nexusos.projeto.Projeto;
import com.nexusos.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.LinkedHashSet;
import java.util.Set;
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
@Table(name = "ordens_servico")
public class OrdemServico {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, updatable = false)
    private Long codigo;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String descricao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projeto_id")
    private Projeto projeto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusOS status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrioridadeOS prioridade;

    private LocalDate prazo;

    private Long sequenciaExecucao;

    @Column(columnDefinition = "text")
    private String entendimento;

    @Column(columnDefinition = "text")
    private String impacto;

    @Column(columnDefinition = "text")
    private String riscos;

    private BigDecimal estimativaHoras;

    @Column(precision = 12, scale = 2)
    private BigDecimal valorTotalEstimado;

    @Column(nullable = false)
    private Boolean cobrar;

    @Column(nullable = false)
    private Boolean paga;

    private String mercadoPagoPreferenceId;

    private String mercadoPagoPaymentId;

    @Column(columnDefinition = "text")
    private String descricaoFinalizacao;

    @Column(columnDefinition = "text")
    private String commitsFinalizacao;

    private String branchFinalizacao;

    @Column(columnDefinition = "text")
    private String arquivosAlteradosFinalizacao;

    private String branchGithub;
    private Integer pullRequestNumero;
    @Column(columnDefinition = "text") private String pullRequestUrl;
    private String pullRequestStatus;
    @Column(columnDefinition = "text") private String commitsGithub;
    @Column(columnDefinition = "text") private String arquivosAlteradosGithub;
    private OffsetDateTime ultimaSincronizacaoGithub;

    private Boolean aprovadaPeloCliente;

    private OffsetDateTime aprovadoPeloClienteEm;

    @Column(columnDefinition = "text")
    private String observacaoAprovacaoCliente;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(nullable = false)
    private OffsetDateTime atualizadoEm;

    private OffsetDateTime finalizadoEm;

    @Builder.Default
    @ManyToMany
    @JoinTable(
            name = "ordens_servico_vinculos",
            joinColumns = @JoinColumn(name = "ordem_servico_id"),
            inverseJoinColumns = @JoinColumn(name = "ordem_servico_vinculada_id")
    )
    private Set<OrdemServico> ordensVinculadas = new LinkedHashSet<>();

    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        status = status == null ? StatusOS.RECEBIDA : status;
        cobrar = cobrar == null ? Boolean.TRUE : cobrar;
        paga = paga == null ? Boolean.FALSE : paga;
        criadoEm = OffsetDateTime.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void preUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }
}
