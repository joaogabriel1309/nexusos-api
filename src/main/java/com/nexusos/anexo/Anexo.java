package com.nexusos.anexo;

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
@Table(name = "anexos")
public class Anexo {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;
    @Column(nullable = false)
    private String nomeArquivo;
    @Column(nullable = false)
    private String tipoArquivo;
    @Column(nullable = false)
    private long tamanho;
    @Column(nullable = false)
    private String caminho;
    private String descricao;
    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;
    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        criadoEm = OffsetDateTime.now();
    }
}
