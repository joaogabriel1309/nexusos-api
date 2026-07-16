package com.nexusos.ordemservico.calendario;

import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.ordemservico.calendario.dto.EventoCalendarioResponse;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CalendarioService {

    private static final long INTERVALO_MAXIMO_DIAS = 366;
    private final OrdemServicoRepository ordemServicoRepository;

    @Transactional(readOnly = true)
    public List<EventoCalendarioResponse> listar(LocalDate inicio, LocalDate fim, UUID responsavelId,
            UUID clienteId, UUID projetoId, PrioridadeOS prioridade, StatusOS status) {
        validarIntervalo(inicio, fim);
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var desenvolvedor = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_DESENVOLVEDOR".equals(authority.getAuthority()));
        var emailResponsavel = desenvolvedor ? authentication.getName() : null;

        return ordemServicoRepository.buscarParaCalendario(
                        inicio, fim, responsavelId, clienteId, projetoId, prioridade, status, emailResponsavel)
                .stream()
                .flatMap(os -> eventosDaOrdem(os, inicio, fim))
                .sorted(Comparator.comparing(EventoCalendarioResponse::data)
                        .thenComparing(EventoCalendarioResponse::ordemServicoCodigo)
                        .thenComparing(EventoCalendarioResponse::tipo))
                .toList();
    }

    private void validarIntervalo(LocalDate inicio, LocalDate fim) {
        if (fim.isBefore(inicio)) {
            throw new RegraNegocioException("A data final deve ser igual ou posterior a data inicial.");
        }
        if (ChronoUnit.DAYS.between(inicio, fim) + 1 > INTERVALO_MAXIMO_DIAS) {
            throw new RegraNegocioException("O intervalo do calendario deve ter no maximo 366 dias.");
        }
    }

    private Stream<EventoCalendarioResponse> eventosDaOrdem(OrdemServico os, LocalDate inicio, LocalDate fim) {
        Stream<EventoCalendarioResponse> eventos = Stream.empty();
        if (estaNoIntervalo(os.getPrazo(), inicio, fim)) {
            eventos = Stream.concat(eventos, Stream.of(criarEvento(os, os.getPrazo(), tipoPrazo(os))));
        }
        if (os.getFinalizadoEm() != null && estaNoIntervalo(os.getFinalizadoEm().toLocalDate(), inicio, fim)) {
            eventos = Stream.concat(eventos, Stream.of(criarEvento(
                    os, os.getFinalizadoEm().toLocalDate(), TipoEventoCalendario.EVENTO_IMPORTANTE)));
        }
        return eventos;
    }

    private boolean estaNoIntervalo(LocalDate data, LocalDate inicio, LocalDate fim) {
        return data != null && !data.isBefore(inicio) && !data.isAfter(fim);
    }

    private TipoEventoCalendario tipoPrazo(OrdemServico os) {
        if (os.getStatus() == StatusOS.AGUARDANDO_PAGAMENTO
                && Boolean.TRUE.equals(os.getCobrar()) && !Boolean.TRUE.equals(os.getPaga())) {
            return TipoEventoCalendario.VENCIMENTO;
        }
        if (os.getStatus() == StatusOS.APROVADA
                || os.getStatus() == StatusOS.EM_DESENVOLVIMENTO
                || os.getStatus() == StatusOS.EM_TESTE) {
            return TipoEventoCalendario.ENTREGA_PREVISTA;
        }
        return TipoEventoCalendario.PRAZO_OS;
    }

    private EventoCalendarioResponse criarEvento(OrdemServico os, LocalDate data, TipoEventoCalendario tipo) {
        var responsavel = os.getResponsavel();
        var projeto = os.getProjeto();
        return new EventoCalendarioResponse(
                os.getId() + ":" + tipo,
                tipo,
                data,
                os.getId(),
                os.getCodigo(),
                os.getTitulo(),
                os.getCliente().getId(),
                os.getCliente().getNome(),
                projeto != null ? projeto.getId() : null,
                projeto != null ? projeto.getNome() : null,
                responsavel != null ? responsavel.getId() : null,
                responsavel != null ? responsavel.getNome() : null,
                os.getPrioridade(),
                os.getStatus()
        );
    }
}
