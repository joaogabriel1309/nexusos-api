package com.nexusos.busca.dto;

import java.util.UUID;

public record BuscaGlobalItemResponse(
        UUID id,
        String titulo,
        String subtitulo,
        String href
) {
}
