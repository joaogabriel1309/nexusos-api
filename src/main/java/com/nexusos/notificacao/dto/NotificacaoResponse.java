package com.nexusos.notificacao.dto;

import com.nexusos.notificacao.Notificacao;
import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificacaoResponse(
        UUID id,
        UUID ordemServicoId,
        Long ordemServicoCodigo,
        UUID solicitacaoId,
        Long solicitacaoCodigo,
        String tipo,
        String titulo,
        String mensagem,
        boolean lida,
        OffsetDateTime criadoEm,
        OffsetDateTime lidaEm
) {
    public static NotificacaoResponse from(Notificacao notificacao) {
        var ordemServico = notificacao.getOrdemServico();
        var solicitacao = notificacao.getSolicitacao();

        return new NotificacaoResponse(
                notificacao.getId(),
                ordemServico != null ? ordemServico.getId() : null,
                ordemServico != null ? ordemServico.getCodigo() : null,
                solicitacao != null ? solicitacao.getId() : null,
                solicitacao != null ? solicitacao.getCodigo() : null,
                notificacao.getTipo(),
                notificacao.getTitulo(),
                notificacao.getMensagem(),
                notificacao.isLida(),
                notificacao.getCriadoEm(),
                notificacao.getLidaEm()
        );
    }
}
