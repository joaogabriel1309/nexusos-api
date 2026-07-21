package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.StatusOS;

public record TransicaoStatusResponse(
        StatusOS status,
        boolean permitida,
        String motivoBloqueio
) {
}
