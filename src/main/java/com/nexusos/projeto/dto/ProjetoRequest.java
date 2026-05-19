package com.nexusos.projeto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjetoRequest(
        @NotBlank @Size(max = 160) String nome,
        String descricao
) {
}
