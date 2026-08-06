package com.nexusos.solicitacao.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record SolicitacaoConversaoRequest(
        @NotBlank @Size(max = 180) String titulo,
        @NotBlank @Size(max = 10000) String descricao,
        UUID projetoId,
        UUID responsavelId,
        PrioridadeOS prioridade,
        LocalDate prazo
) {
}
