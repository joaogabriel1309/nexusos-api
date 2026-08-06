package com.nexusos.solicitacao.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.solicitacao.Solicitacao;
import com.nexusos.solicitacao.StatusSolicitacao;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SolicitacaoResumoResponse(
        UUID id,
        Long codigo,
        String titulo,
        String descricao,
        UUID clienteId,
        String clienteNome,
        UUID responsavelId,
        String responsavelNome,
        PrioridadeOS prioridade,
        StatusSolicitacao status,
        UUID ticketId,
        Long ticketCodigo,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm
) {
    public static SolicitacaoResumoResponse from(Solicitacao solicitacao) {
        var responsavel = solicitacao.getResponsavel();
        var ticket = solicitacao.getOrdemServico();
        return new SolicitacaoResumoResponse(
                solicitacao.getId(), solicitacao.getCodigo(), solicitacao.getTitulo(), solicitacao.getDescricao(),
                solicitacao.getCliente().getId(), solicitacao.getCliente().getNome(),
                responsavel != null ? responsavel.getId() : null,
                responsavel != null ? responsavel.getNome() : null,
                solicitacao.getPrioridade(), solicitacao.getStatus(),
                ticket != null ? ticket.getId() : null, ticket != null ? ticket.getCodigo() : null,
                solicitacao.getCriadoEm(), solicitacao.getAtualizadoEm());
    }
}
