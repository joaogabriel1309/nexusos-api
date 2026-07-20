package com.nexusos.ordemservico.dto;

import java.util.List;

public record CentralPendenciasResponse(
        List<OrdemServicoResponse> vencidas,
        List<OrdemServicoResponse> vencemHoje,
        List<OrdemServicoResponse> semResponsavel,
        List<OrdemServicoResponse> aguardandoAprovacaoAdmin,
        List<OrdemServicoResponse> aguardandoCliente,
        List<OrdemServicoResponse> aguardandoPagamento,
        List<OrdemServicoResponse> reprovadasPeloCliente
) {
}
