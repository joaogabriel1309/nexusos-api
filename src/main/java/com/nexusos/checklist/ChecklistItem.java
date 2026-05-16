package com.nexusos.checklist;

import com.nexusos.ordemservico.OrdemServico;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "checklist_itens")
public class ChecklistItem {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;
    @Column(nullable = false)
    private String descricao;
    @Column(nullable = false)
    private boolean obrigatorio;
    @Column(nullable = false)
    private boolean concluido;
    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;
    private OffsetDateTime concluidoEm;
    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        criadoEm = OffsetDateTime.now();
    }
}
