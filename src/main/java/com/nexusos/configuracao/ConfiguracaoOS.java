package com.nexusos.configuracao;

import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.usuario.Usuario;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "configuracoes_os")
public class ConfiguracaoOS {
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    @Id private UUID id;
    @Column(nullable = false) private Integer prazoBaixaDias;
    @Column(nullable = false) private Integer prazoMediaDias;
    @Column(nullable = false) private Integer prazoAltaDias;
    @Column(nullable = false) private Integer prazoCriticaDias;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PrioridadeOS prioridadePadrao;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "responsavel_padrao_id") private Usuario responsavelPadrao;
    @Column(nullable = false) private Boolean permitirSemResponsavel;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusOS statusInicial;
    @Column(nullable = false) private Boolean exigirAnaliseAntesCliente;
    @Column(nullable = false) private Boolean exigirAprovacaoAdminAntesCliente;
    @Column(nullable = false) private OffsetDateTime atualizadoEm;
    @PreUpdate void preUpdate() { atualizadoEm = OffsetDateTime.now(); }
}
