package com.nexusos.portalcliente.dto;

import jakarta.validation.constraints.Size;

public record PortalAprovacaoRequest(@Size(max = 2000) String observacao) {
}
