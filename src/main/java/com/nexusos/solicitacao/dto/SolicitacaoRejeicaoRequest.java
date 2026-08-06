package com.nexusos.solicitacao.dto;

import com.nexusos.solicitacao.MotivoRejeicaoSolicitacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitacaoRejeicaoRequest(
        @NotNull MotivoRejeicaoSolicitacao motivo,
        @NotBlank @Size(max = 2000) String detalhe
) {
}
