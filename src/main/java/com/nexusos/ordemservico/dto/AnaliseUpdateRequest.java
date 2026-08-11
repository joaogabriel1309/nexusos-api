package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AnaliseUpdateRequest(
        @Size(max = 10000) String entendimento,
        @Size(max = 10000) String impacto,
        @Size(max = 10000) String riscos,
        @PositiveOrZero BigDecimal estimativaHoras,
        Boolean cobrar
) {
}
