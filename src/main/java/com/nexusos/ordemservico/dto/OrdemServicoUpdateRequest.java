package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record OrdemServicoUpdateRequest(
        @NotBlank @Size(max = 180) String titulo,
        @NotBlank @Size(max = 10000) String descricao,
        @NotNull UUID clienteId,
        UUID responsavelId,
        UUID projetoId,
        @NotNull PrioridadeOS prioridade,
        LocalDate prazo,
        boolean prazoIndefinido,
        @Size(max = 10000) String entendimento,
        @Size(max = 10000) String impacto,
        @Size(max = 10000) String riscos,
        @PositiveOrZero BigDecimal estimativaHoras
) {
}
