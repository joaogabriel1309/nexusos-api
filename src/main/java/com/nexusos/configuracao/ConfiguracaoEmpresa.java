package com.nexusos.configuracao;

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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "configuracoes_empresa")
public class ConfiguracaoEmpresa {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Id
    private UUID id;
    @Column(nullable = false, length = 160)
    private String nome;
    @Column(columnDefinition = "TEXT")
    private String logo;
    @Column(length = 18)
    private String documento;
    @Column(length = 160)
    private String email;
    @Column(length = 32)
    private String telefone;
    @Column(length = 300)
    private String endereco;
    @Column(name = "cor_principal", nullable = false, length = 7)
    private String corPrincipal;
    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @PreUpdate
    void preUpdate() {
        atualizadoEm = OffsetDateTime.now();
    }
}
