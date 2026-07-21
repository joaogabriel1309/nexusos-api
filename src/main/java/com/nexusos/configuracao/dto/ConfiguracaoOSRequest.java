package com.nexusos.configuracao.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import jakarta.validation.constraints.*;
import java.util.UUID;

public record ConfiguracaoOSRequest(
        @NotNull @Min(0) @Max(3650) Integer prazoBaixaDias,
        @NotNull @Min(0) @Max(3650) Integer prazoMediaDias,
        @NotNull @Min(0) @Max(3650) Integer prazoAltaDias,
        @NotNull @Min(0) @Max(3650) Integer prazoCriticaDias,
        @NotNull PrioridadeOS prioridadePadrao,
        UUID responsavelPadraoId,
        @NotNull Boolean permitirSemResponsavel,
        @NotNull StatusOS statusInicial,
        @NotNull Boolean exigirAnaliseAntesCliente,
        @NotNull Boolean exigirAprovacaoAdminAntesCliente
) {}
