package com.nexusos.ordemservico;

import com.nexusos.configuracao.ConfiguracaoOSService;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SlaPrioridadeService {

    private final ConfiguracaoOSService configuracaoOSService;

    public SlaPrioridadeService(ConfiguracaoOSService configuracaoOSService) {
        this.configuracaoOSService = configuracaoOSService;
    }

    public LocalDate calcularPrazo(PrioridadeOS prioridade) {
        return configuracaoOSService.calcularPrazo(prioridade);
    }

    public Map<String, Integer> listarDiasPorPrioridade() {
        var c = configuracaoOSService.buscarEntidade();
        var resultado = new LinkedHashMap<String, Integer>();
        resultado.put(PrioridadeOS.CRITICA.name(), c.getPrazoCriticaDias());
        resultado.put(PrioridadeOS.ALTA.name(), c.getPrazoAltaDias());
        resultado.put(PrioridadeOS.MEDIA.name(), c.getPrazoMediaDias());
        resultado.put(PrioridadeOS.BAIXA.name(), c.getPrazoBaixaDias());
        return resultado;
    }
}
