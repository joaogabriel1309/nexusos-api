package com.nexusos.portalcliente.dto;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.StatusOS;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PortalOrdemServicoResponse(
        UUID id,
        String titulo,
        String descricao,
        StatusOS status,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        Boolean aprovadaPeloCliente,
        OffsetDateTime aprovadoPeloClienteEm,
        String observacaoAprovacaoCliente
) {
    public static PortalOrdemServicoResponse from(OrdemServico os) {
        return new PortalOrdemServicoResponse(
                os.getId(),
                os.getTitulo(),
                os.getDescricao(),
                os.getStatus(),
                os.getCriadoEm(),
                os.getAtualizadoEm(),
                os.getAprovadaPeloCliente(),
                os.getAprovadoPeloClienteEm(),
                os.getObservacaoAprovacaoCliente()
        );
    }
}
