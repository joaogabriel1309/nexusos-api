package com.nexusos.configuracao.dto;

import com.nexusos.configuracao.ConfiguracaoOS;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ConfiguracaoOSResponse(
        Integer prazoBaixaDias, Integer prazoMediaDias, Integer prazoAltaDias, Integer prazoCriticaDias,
        PrioridadeOS prioridadePadrao, UUID responsavelPadraoId, String responsavelPadraoNome,
        Boolean permitirSemResponsavel, StatusOS statusInicial, Boolean exigirAnaliseAntesCliente,
        Boolean exigirAprovacaoAdminAntesCliente, OffsetDateTime atualizadoEm
) {
    public static ConfiguracaoOSResponse from(ConfiguracaoOS c) {
        var responsavel = c.getResponsavelPadrao();
        return new ConfiguracaoOSResponse(c.getPrazoBaixaDias(), c.getPrazoMediaDias(), c.getPrazoAltaDias(),
                c.getPrazoCriticaDias(), c.getPrioridadePadrao(), responsavel == null ? null : responsavel.getId(),
                responsavel == null ? null : responsavel.getNome(), c.getPermitirSemResponsavel(), c.getStatusInicial(),
                c.getExigirAnaliseAntesCliente(), c.getExigirAprovacaoAdminAntesCliente(), c.getAtualizadoEm());
    }
}
