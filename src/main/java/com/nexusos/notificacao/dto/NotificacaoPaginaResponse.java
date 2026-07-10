package com.nexusos.notificacao.dto;

import java.util.List;

public record NotificacaoPaginaResponse(
        long naoLidas,
        long totalItens,
        int pagina,
        int tamanho,
        int totalPaginas,
        List<String> tiposDisponiveis,
        List<NotificacaoResponse> itens
) {
}
