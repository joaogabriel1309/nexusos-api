package com.nexusos.solicitacao.dto;

import com.nexusos.solicitacao.AnexoSolicitacao;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SolicitacaoAnexoResponse(
        UUID id,
        UUID interacaoId,
        String nomeArquivo,
        String tipoArquivo,
        long tamanho,
        boolean enviadoPeloCliente,
        OffsetDateTime criadoEm
) {
    public static SolicitacaoAnexoResponse from(AnexoSolicitacao anexo) {
        return new SolicitacaoAnexoResponse(
                anexo.getId(), anexo.getInteracao() != null ? anexo.getInteracao().getId() : null,
                anexo.getNomeArquivo(), anexo.getTipoArquivo(), anexo.getTamanho(),
                anexo.isEnviadoPeloCliente(), anexo.getCriadoEm());
    }
}
