package com.nexusos.ordemservico;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SlaPrioridadeService {

    private final Map<PrioridadeOS, Integer> diasPorPrioridade = new EnumMap<>(PrioridadeOS.class);

    public SlaPrioridadeService(
            @Value("${nexusos.sla.baixa-dias:10}") int baixaDias,
            @Value("${nexusos.sla.media-dias:5}") int mediaDias,
            @Value("${nexusos.sla.alta-dias:2}") int altaDias,
            @Value("${nexusos.sla.critica-dias:1}") int criticaDias
    ) {
        diasPorPrioridade.put(PrioridadeOS.BAIXA, baixaDias);
        diasPorPrioridade.put(PrioridadeOS.MEDIA, mediaDias);
        diasPorPrioridade.put(PrioridadeOS.ALTA, altaDias);
        diasPorPrioridade.put(PrioridadeOS.CRITICA, criticaDias);
    }

    public LocalDate calcularPrazo(PrioridadeOS prioridade) {
        return LocalDate.now().plusDays(diasPorPrioridade.getOrDefault(prioridade, diasPorPrioridade.get(PrioridadeOS.MEDIA)));
    }

    public Map<String, Integer> listarDiasPorPrioridade() {
        var resultado = new LinkedHashMap<String, Integer>();
        resultado.put(PrioridadeOS.CRITICA.name(), diasPorPrioridade.get(PrioridadeOS.CRITICA));
        resultado.put(PrioridadeOS.ALTA.name(), diasPorPrioridade.get(PrioridadeOS.ALTA));
        resultado.put(PrioridadeOS.MEDIA.name(), diasPorPrioridade.get(PrioridadeOS.MEDIA));
        resultado.put(PrioridadeOS.BAIXA.name(), diasPorPrioridade.get(PrioridadeOS.BAIXA));
        return resultado;
    }
}
