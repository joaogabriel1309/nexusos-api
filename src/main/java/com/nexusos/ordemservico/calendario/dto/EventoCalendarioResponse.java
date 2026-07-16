package com.nexusos.ordemservico.calendario.dto;

import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.ordemservico.calendario.TipoEventoCalendario;
import java.time.LocalDate;
import java.util.UUID;

public record EventoCalendarioResponse(
        String id,
        TipoEventoCalendario tipo,
        LocalDate data,
        UUID ordemServicoId,
        Long ordemServicoCodigo,
        String titulo,
        UUID clienteId,
        String clienteNome,
        UUID projetoId,
        String projetoNome,
        UUID responsavelId,
        String responsavelNome,
        PrioridadeOS prioridade,
        StatusOS status
) {
}
