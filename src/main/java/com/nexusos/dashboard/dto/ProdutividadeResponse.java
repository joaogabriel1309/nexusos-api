package com.nexusos.dashboard.dto;

public record ProdutividadeResponse(
        long totalOs,
        long osFinalizadas,
        double percentualFinalizacao,
        double tempoMedioFinalizacaoHoras
) {
}
