package com.nexusos.dashboard.dto;

import java.util.Map;

public record DashboardResumoResponse(
        long totalOs,
        long osAbertas,
        long osFinalizadas,
        long osVencidas,
        long osVencemHoje,
        long osSemResponsavel,
        Map<String, Long> osPorPrioridade,
        Map<String, Integer> slaPorPrioridade,
        double tempoMedioFinalizacaoHoras
) {
}
