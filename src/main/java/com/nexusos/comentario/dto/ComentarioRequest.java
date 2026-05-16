package com.nexusos.comentario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ComentarioRequest(@NotNull UUID usuarioId, @NotBlank String mensagem) {
}
