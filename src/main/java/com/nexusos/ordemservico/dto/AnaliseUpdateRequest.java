package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record AnaliseUpdateRequest(
        String entendimento,
        String impacto,
        String riscos,
        @PositiveOrZero BigDecimal estimativaHoras,
        Boolean cobrar
) {
}
