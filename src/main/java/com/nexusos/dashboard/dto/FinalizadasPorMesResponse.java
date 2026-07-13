package com.nexusos.dashboard.dto;

public record FinalizadasPorMesResponse(
        String mes,
        String rotulo,
        long total
) {
}
