package com.nexusos.solicitacao.dto;

import com.nexusos.solicitacao.MotivoRejeicaoSolicitacao;
import java.util.List;

public record SolicitacaoDetalheResponse(
        SolicitacaoResumoResponse solicitacao,
        MotivoRejeicaoSolicitacao motivoRejeicao,
        String detalheRejeicao,
        List<SolicitacaoInteracaoResponse> interacoes,
        List<SolicitacaoAnexoResponse> anexos,
        List<AuditoriaSolicitacaoResponse> auditoria
) {
}
