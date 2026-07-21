package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.PrioridadeOS;

public record AnaliseIAResponse(
        String resumoTecnico,
        String descricaoCliente,
        PrioridadeOS prioridadeSugerida,
        String riscoAtraso,
        String textoEntregaFinal) {}
