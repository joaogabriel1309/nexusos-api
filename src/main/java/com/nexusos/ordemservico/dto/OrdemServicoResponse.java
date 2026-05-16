package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrdemServicoResponse(
        UUID id,
        String titulo,
        String descricao,
        UUID clienteId,
        String clienteNome,
        UUID responsavelId,
        String responsavelNome,
        StatusOS status,
        PrioridadeOS prioridade,
        LocalDate prazo,
        String entendimento,
        String impacto,
        String riscos,
        BigDecimal estimativaHoras,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        OffsetDateTime finalizadoEm
) {
    public static OrdemServicoResponse from(OrdemServico os) {
        var responsavel = os.getResponsavel();
        return new OrdemServicoResponse(
                os.getId(),
                os.getTitulo(),
                os.getDescricao(),
                os.getCliente().getId(),
                os.getCliente().getNome(),
                responsavel != null ? responsavel.getId() : null,
                responsavel != null ? responsavel.getNome() : null,
                os.getStatus(),
                os.getPrioridade(),
                os.getPrazo(),
                os.getEntendimento(),
                os.getImpacto(),
                os.getRiscos(),
                os.getEstimativaHoras(),
                os.getCriadoEm(),
                os.getAtualizadoEm(),
                os.getFinalizadoEm()
        );
    }
}
