package com.nexusos.notificacao.dto;

import java.util.List;

public record NotificacaoResumoResponse(
        long naoLidas,
        List<NotificacaoResponse> itens
) {
}
