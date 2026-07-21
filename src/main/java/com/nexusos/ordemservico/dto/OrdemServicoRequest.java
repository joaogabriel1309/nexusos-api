package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record OrdemServicoRequest(
        @NotBlank @Size(max = 180) String titulo,
        @NotBlank String descricao,
        @NotNull UUID clienteId,
        UUID responsavelId,
        UUID projetoId,
        PrioridadeOS prioridade,
        LocalDate prazo,
        @PositiveOrZero BigDecimal estimativaHoras
) {
}
