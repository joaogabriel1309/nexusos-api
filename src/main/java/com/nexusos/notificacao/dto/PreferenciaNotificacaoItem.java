package com.nexusos.notificacao.dto;

import com.nexusos.notificacao.TipoPreferenciaNotificacao;
import jakarta.validation.constraints.NotNull;

public record PreferenciaNotificacaoItem(
        @NotNull TipoPreferenciaNotificacao tipo,
        @NotNull Boolean habilitada
) {
}
