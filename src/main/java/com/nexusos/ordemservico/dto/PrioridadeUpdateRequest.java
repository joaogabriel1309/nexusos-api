package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import jakarta.validation.constraints.NotNull;

public record PrioridadeUpdateRequest(@NotNull PrioridadeOS prioridade) {
}
