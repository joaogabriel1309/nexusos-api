package com.nexusos.ordemservico.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ResponsavelUpdateRequest(@NotNull UUID responsavelId) {
}
