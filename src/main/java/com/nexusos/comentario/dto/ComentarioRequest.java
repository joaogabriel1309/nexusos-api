package com.nexusos.comentario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComentarioRequest(
        @NotBlank @Size(max = 5000) String mensagem
) {
}
