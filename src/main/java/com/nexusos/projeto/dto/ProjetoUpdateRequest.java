package com.nexusos.projeto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ProjetoUpdateRequest(
        @NotBlank @Size(max = 160) String nome,
        String descricao,
        @NotNull UUID clienteId,
        @NotNull Boolean ativo
) {
}
