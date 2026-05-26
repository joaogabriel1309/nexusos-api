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
        Long codigo,
        String titulo,
        String descricao,
        UUID clienteId,
        String clienteNome,
        UUID responsavelId,
        String responsavelNome,
        UUID projetoId,
        String projetoNome,
        StatusOS status,
        PrioridadeOS prioridade,
        LocalDate prazo,
        String entendimento,
        String impacto,
        String riscos,
        BigDecimal estimativaHoras,
        BigDecimal valorTotalEstimado,
        Boolean cobrar,
        String descricaoFinalizacao,
        Boolean aprovadaPeloCliente,
        OffsetDateTime aprovadoPeloClienteEm,
        String observacaoAprovacaoCliente,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        OffsetDateTime finalizadoEm
) {
    public static OrdemServicoResponse from(OrdemServico os) {
        var responsavel = os.getResponsavel();
        var projeto = os.getProjeto();
        return new OrdemServicoResponse(
                os.getId(),
                os.getCodigo(),
                os.getTitulo(),
                os.getDescricao(),
                os.getCliente().getId(),
                os.getCliente().getNome(),
                responsavel != null ? responsavel.getId() : null,
                responsavel != null ? responsavel.getNome() : null,
                projeto != null ? projeto.getId() : null,
                projeto != null ? projeto.getNome() : null,
                os.getStatus(),
                os.getPrioridade(),
                os.getPrazo(),
                os.getEntendimento(),
                os.getImpacto(),
                os.getRiscos(),
                os.getEstimativaHoras(),
                os.getValorTotalEstimado(),
                os.getCobrar(),
                os.getDescricaoFinalizacao(),
                os.getAprovadaPeloCliente(),
                os.getAprovadoPeloClienteEm(),
                os.getObservacaoAprovacaoCliente(),
                os.getCriadoEm(),
                os.getAtualizadoEm(),
                os.getFinalizadoEm()
        );
    }
}
