package com.nexusos.notificacao.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PreferenciasNotificacaoRequest(
        @NotNull @Size(min = 6, max = 6) List<@NotNull @Valid PreferenciaNotificacaoItem> preferencias
) {
}
