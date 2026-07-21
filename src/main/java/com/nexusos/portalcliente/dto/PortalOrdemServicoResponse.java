package com.nexusos.portalcliente.dto;

import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PortalOrdemServicoResponse(
        UUID id,
        Long codigo,
        String titulo,
        String descricao,
        StatusOS status,
        PrioridadeOS prioridade,
        UUID projetoId,
        String projetoNome,
        String textoAnalise,
        BigDecimal valorTotalEstimado,
        Boolean pagamentoDisponivel,
        Boolean paga,
        Boolean pagamentoIniciado,
        String descricaoFinalizacao,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        OffsetDateTime finalizadoEm,
        Boolean aprovadaPeloCliente,
        OffsetDateTime aprovadoPeloClienteEm,
        String observacaoAprovacaoCliente
) {
    public static PortalOrdemServicoResponse from(OrdemServico os) {
        return new PortalOrdemServicoResponse(
                os.getId(),
                os.getCodigo(),
                os.getTitulo(),
                os.getDescricao(),
                os.getStatus(),
                os.getPrioridade(),
                os.getProjeto() != null ? os.getProjeto().getId() : null,
                os.getProjeto() != null ? os.getProjeto().getNome() : null,
                os.getEntendimento(),
                os.getValorTotalEstimado(),
                !Boolean.FALSE.equals(os.getCobrar()),
                os.getPaga(),
                os.getMercadoPagoPreferenceId() != null,
                os.getDescricaoFinalizacao(),
                os.getCriadoEm(),
                os.getAtualizadoEm(),
                os.getFinalizadoEm(),
                os.getAprovadaPeloCliente(),
                os.getAprovadoPeloClienteEm(),
                os.getObservacaoAprovacaoCliente()
        );
    }
}
