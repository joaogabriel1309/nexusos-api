package com.nexusos.dashboard;

import com.nexusos.dashboard.dto.DashboardResumoResponse;
import com.nexusos.dashboard.dto.FinalizadasPorMesResponse;
import com.nexusos.dashboard.dto.ProdutividadeResponse;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.SlaPrioridadeService;
import com.nexusos.ordemservico.StatusOS;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.IntStream;
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
        var encerradas = List.of(StatusOS.FINALIZADA, StatusOS.CANCELADA);
        var hoje = LocalDate.now();
        return new DashboardResumoResponse(
                total,
                ordemServicoRepository.countByStatusNotIn(encerradas),
                finalizadas,
                ordemServicoRepository.countByStatusNotInAndPrazoBefore(encerradas, hoje),
                ordemServicoRepository.countByStatusNotInAndPrazo(encerradas, hoje),
                ordemServicoRepository.countByStatusNotInAndResponsavelIsNull(encerradas),
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

    @Transactional(readOnly = true)
    public List<FinalizadasPorMesResponse> finalizadasPorMes() {
        var mesAtual = YearMonth.now();
        var rotuloFormatter = DateTimeFormatter.ofPattern("MMM/yy", Locale.forLanguageTag("pt-BR"));

        return IntStream.rangeClosed(0, 5)
                .mapToObj(offset -> mesAtual.minusMonths(5L - offset))
                .map(mes -> {
                    var inicio = mes.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
                    var fim = mes.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
                    var total = ordemServicoRepository.countByStatusAndFinalizadoEmGreaterThanEqualAndFinalizadoEmLessThan(
                            StatusOS.FINALIZADA,
                            inicio,
                            fim
                    );
                    return new FinalizadasPorMesResponse(mes.toString(), mes.format(rotuloFormatter), total);
                })
                .toList();
    }

    private Map<String, Long> osPorPrioridade() {
        return Arrays.stream(PrioridadeOS.values())
                .collect(Collectors.toMap(Enum::name,
                        ordemServicoRepository::countByPrioridade));
    }
}
