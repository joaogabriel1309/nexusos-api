package com.nexusos.github;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Entity @Table(name = "configuracoes_github")
public class ConfiguracaoGithub {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000006");
    @Id private UUID id;
    @Column(nullable = false) private boolean habilitado;
    private String owner;
    private String repositorio;
    @Column(name = "token_criptografado", columnDefinition = "text") private String tokenCriptografado;
    private String branchPrincipal;
    @Column(nullable = false, updatable = false) private OffsetDateTime criadoEm;
    @Column(nullable = false) private OffsetDateTime atualizadoEm;
    public boolean configurado() { return preenchido(owner) && preenchido(repositorio) && preenchido(tokenCriptografado) && preenchido(branchPrincipal); }
    private boolean preenchido(String valor) { return valor != null && !valor.isBlank(); }
    @PreUpdate void preUpdate() { atualizadoEm = OffsetDateTime.now(); }
}
