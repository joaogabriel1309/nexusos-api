package com.nexusos.configuracao;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Getter @Setter @NoArgsConstructor
@Entity @Table(name = "configuracoes_ia")
public class ConfiguracaoIA {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000006");
    @Id private UUID id;
    @Column(nullable = false) private boolean habilitado;
    @Column(nullable = false, length = 300) private String apiUrl;
    @Column(nullable = false, length = 100) private String modelo;
    @Column(columnDefinition = "text") private String apiKeyCriptografada;
    @Column(nullable = false, precision = 3, scale = 2) private BigDecimal temperatura;
    @Column(nullable = false) private OffsetDateTime atualizadoEm;
    @PreUpdate void preUpdate() { atualizadoEm = OffsetDateTime.now(); }
}
