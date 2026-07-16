package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.StatusOS;
import java.util.UUID;

public record OrdemServicoVinculadaResponse(
        UUID id,
        Long codigo,
        String titulo,
        StatusOS status
) {
    public static OrdemServicoVinculadaResponse from(OrdemServico ordem) {
        return new OrdemServicoVinculadaResponse(
                ordem.getId(), ordem.getCodigo(), ordem.getTitulo(), ordem.getStatus());
    }
}
