package com.nexusos.exception;

import java.time.OffsetDateTime;
import java.util.List;

public record ErroResponse(
        OffsetDateTime timestamp,
        int status,
        String erro,
        String mensagem,
        String path,
        List<CampoErro> campos
) {
    public record CampoErro(String campo, String mensagem) {
    }
}
