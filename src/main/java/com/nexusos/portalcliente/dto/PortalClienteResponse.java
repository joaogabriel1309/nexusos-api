package com.nexusos.portalcliente.dto;

import java.util.List;

public record PortalClienteResponse(
        String clienteNome,
        List<PortalOrdemServicoResponse> ordens
) {
}
