package com.nexusos.solicitacao.dto;

import com.nexusos.solicitacao.InteracaoSolicitacao;
import com.nexusos.solicitacao.OrigemSolicitacao;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SolicitacaoInteracaoResponse(
        UUID id,
        OrigemSolicitacao origem,
        String autorNome,
        String mensagem,
        OffsetDateTime criadoEm
) {
    public static SolicitacaoInteracaoResponse from(InteracaoSolicitacao interacao) {
        var autor = switch (interacao.getOrigem()) {
            case CLIENTE -> interacao.getSolicitacao().getCliente().getNome();
            case EQUIPE -> interacao.getUsuario() != null ? interacao.getUsuario().getNome() : "Equipe";
            case SISTEMA -> "Sistema";
        };
        return new SolicitacaoInteracaoResponse(
                interacao.getId(), interacao.getOrigem(), autor,
                interacao.getMensagem(), interacao.getCriadoEm());
    }
}
