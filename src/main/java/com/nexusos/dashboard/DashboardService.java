package com.nexusos.dashboard;

import com.nexusos.dashboard.dto.DashboardResumoResponse;
import com.nexusos.dashboard.dto.ProdutividadeResponse;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.SlaPrioridadeService;
import com.nexusos.ordemservico.StatusOS;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrdemServicoRepository ordemServicoRepository;
    private final SlaPrioridadeService slaPrioridadeService;

    @Transactional(readOnly = true)
    public DashboardResumoResponse resumo() {
        var total = ordemServicoRepository.count();
        var finalizadas = ordemServicoRepository.countByStatus(StatusOS.FINALIZADA);
        var hoje = LocalDate.now();
        return new DashboardResumoResponse(
                total,
                total - finalizadas,
                finalizadas,
                ordemServicoRepository.countByStatusNotAndPrazoBefore(StatusOS.FINALIZADA, hoje),
                ordemServicoRepository.countByStatusNotAndPrazo(StatusOS.FINALIZADA, hoje),
                ordemServicoRepository.countByStatusNotAndResponsavelIsNull(StatusOS.FINALIZADA),
                osPorPrioridade(),
                slaPrioridadeService.listarDiasPorPrioridade(),
                ordemServicoRepository.calcularTempoMedioFinalizacaoHoras()
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Long> osPorStatus() {
        return Arrays.stream(StatusOS.values())
                .collect(Collectors.toMap(Enum::name, ordemServicoRepository::countByStatus));
    }

    @Transactional(readOnly = true)
    public ProdutividadeResponse produtividade() {
        var total = ordemServicoRepository.count();
        var finalizadas = ordemServicoRepository.countByStatus(StatusOS.FINALIZADA);
        var percentual = total == 0 ? 0 : (finalizadas * 100.0) / total;
        return new ProdutividadeResponse(total, finalizadas, percentual,
                ordemServicoRepository.calcularTempoMedioFinalizacaoHoras());
    }

    private Map<String, Long> osPorPrioridade() {
        return Arrays.stream(PrioridadeOS.values())
                .collect(Collectors.toMap(Enum::name,
                        ordemServicoRepository::countByPrioridade));
    }
}
