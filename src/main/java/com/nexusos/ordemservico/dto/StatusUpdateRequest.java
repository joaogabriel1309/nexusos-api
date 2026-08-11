package com.nexusos.ordemservico.dto;

import com.nexusos.ordemservico.StatusOS;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StatusUpdateRequest(
        @NotNull StatusOS status,
        @Size(max = 10000) String descricao,
        @Size(max = 5000) String commitsFinalizacao,
        @Size(max = 255) String branchFinalizacao,
        @Size(max = 10000) String arquivosAlteradosFinalizacao
) {
}
