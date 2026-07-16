package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Set;
import java.util.UUID;

public record VinculosUpdateRequest(@NotNull Set<@NotNull UUID> ordemServicoIds) {
}
