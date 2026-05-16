package com.nexusos.comentario;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.usuario.Usuario;
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
@Table(name = "comentarios")
public class Comentario {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
    @Column(nullable = false, columnDefinition = "text")
    private String mensagem;
    @Column(nullable = false, updatable = false)
    private OffsetDateTime criadoEm;
    @PrePersist
    void prePersist() {
        id = id == null ? UUID.randomUUID() : id;
        criadoEm = OffsetDateTime.now();
    }
}
