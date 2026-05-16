package com.nexusos.dashboard.dto;

import java.util.Map;

public record DashboardResumoResponse(
        long totalOs,
        long osAbertas,
        long osFinalizadas,
        Map<String, Long> osPorPrioridade,
        double tempoMedioFinalizacaoHoras
) {
}
