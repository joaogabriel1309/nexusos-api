package com.nexusos.solicitacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitacaoMensagemRequest(
        @NotBlank @Size(max = 5000) String mensagem
) {
}
