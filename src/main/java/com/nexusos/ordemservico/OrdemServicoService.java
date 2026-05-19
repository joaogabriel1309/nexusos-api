package com.nexusos.ordemservico;

import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.cliente.ClienteService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import com.nexusos.ordemservico.dto.OrdemServicoRequest;
import com.nexusos.ordemservico.dto.OrdemServicoResponse;
import com.nexusos.ordemservico.dto.OrdemServicoUpdateRequest;
import com.nexusos.ordemservico.dto.ResponsavelUpdateRequest;
import com.nexusos.ordemservico.dto.StatusUpdateRequest;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrdemServicoService {

    private static final Map<StatusOS, Set<StatusOS>> TRANSICOES = new EnumMap<>(StatusOS.class);

    static {
        TRANSICOES.put(StatusOS.RECEBIDA, Set.of(StatusOS.EM_ANALISE, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.EM_ANALISE, Set.of(StatusOS.APROVADA, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.APROVADA, Set.of(StatusOS.EM_DESENVOLVIMENTO, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.EM_DESENVOLVIMENTO, Set.of(StatusOS.EM_TESTES, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.EM_TESTES, Set.of(StatusOS.AGUARDANDO_VALIDACAO, StatusOS.EM_DESENVOLVIMENTO, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.AGUARDANDO_VALIDACAO, Set.of(StatusOS.AGUARDANDO_PAGAMENTO, StatusOS.EM_DESENVOLVIMENTO, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.AGUARDANDO_PAGAMENTO, Set.of(StatusOS.FINALIZADA, StatusOS.EM_DESENVOLVIMENTO, StatusOS.CANCELADA));
        TRANSICOES.put(StatusOS.FINALIZADA, Set.of());
        TRANSICOES.put(StatusOS.CANCELADA, Set.of());
    }

    private final OrdemServicoRepository ordemServicoRepository;
    private final ClienteService clienteService;
    private final UsuarioService usuarioService;
    private final AuditoriaService auditoriaService;

    @Transactional(readOnly = true)
    public List<OrdemServicoResponse> listar() {
        return ordemServicoRepository.findAll().stream().map(OrdemServicoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrdemServicoResponse buscarPorId(UUID id) {
        return OrdemServicoResponse.from(buscarEntidade(id));
    }

    @Transactional
    public OrdemServicoResponse criar(OrdemServicoRequest request) {
        var cliente = clienteService.buscarEntidade(request.clienteId());
        var responsavel = request.responsavelId() != null ? usuarioService.buscarEntidade(request.responsavelId()) : null;
        var os = OrdemServico.builder()
                .titulo(request.titulo())
                .descricao(request.descricao())
                .cliente(cliente)
                .responsavel(responsavel)
                .status(StatusOS.RECEBIDA)
                .prioridade(request.prioridade())
                .prazo(request.prazo())
                .estimativaHoras(request.estimativaHoras())
                .build();
        recalcularValorTotalEstimado(os);
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, responsavel, "CRIACAO", "Ordem de servico criada.", null, salva.getStatus());
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizar(UUID id, OrdemServicoUpdateRequest request) {
        var os = buscarEntidade(id);
        os.setTitulo(request.titulo());
        os.setDescricao(request.descricao());
        os.setCliente(clienteService.buscarEntidade(request.clienteId()));
        os.setResponsavel(request.responsavelId() != null ? usuarioService.buscarEntidade(request.responsavelId()) : null);
        os.setPrioridade(request.prioridade());
        os.setPrazo(request.prazo());
        os.setEntendimento(request.entendimento());
        os.setImpacto(request.impacto());
        os.setRiscos(request.riscos());
        os.setEstimativaHoras(request.estimativaHoras());
        recalcularValorTotalEstimado(os);
        return OrdemServicoResponse.from(ordemServicoRepository.save(os));
    }

    @Transactional
    public void excluir(UUID id) {
        var os = buscarEntidade(id);
        ordemServicoRepository.delete(os);
    }

    @Transactional
    public OrdemServicoResponse atualizarStatus(UUID id, StatusUpdateRequest request) {
        var os = buscarEntidade(id);
        var statusAnterior = os.getStatus();
        validarTransicao(statusAnterior, request.status());
        os.setStatus(request.status());
        if (request.status() == StatusOS.FINALIZADA) {
            os.setFinalizadoEm(OffsetDateTime.now());
            os.setDescricaoFinalizacao(request.descricao());
        }
        if (request.status() != StatusOS.FINALIZADA) {
            os.setFinalizadoEm(null);
            os.setDescricaoFinalizacao(null);
        }
        var usuario = request.usuarioId() != null ? usuarioService.buscarEntidade(request.usuarioId()) : null;
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, usuario, "ALTERACAO_STATUS",
                request.descricao() != null ? request.descricao() : "Status da OS alterado.",
                statusAnterior, request.status());
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarAnalise(UUID id, AnaliseUpdateRequest request) {
        var os = buscarEntidade(id);
        os.setEntendimento(request.entendimento());
        os.setImpacto(request.impacto());
        os.setRiscos(request.riscos());
        os.setEstimativaHoras(request.estimativaHoras());
        recalcularValorTotalEstimado(os);
        auditoriaService.registrar(os, os.getResponsavel(), "ANALISE", "Analise tecnica atualizada.", null, os.getStatus());
        return OrdemServicoResponse.from(ordemServicoRepository.save(os));
    }

    @Transactional
    public OrdemServicoResponse atualizarResponsavel(UUID id, ResponsavelUpdateRequest request) {
        var os = buscarEntidade(id);
        Usuario responsavel = usuarioService.buscarEntidade(request.responsavelId());
        os.setResponsavel(responsavel);
        auditoriaService.registrar(os, responsavel, "RESPONSAVEL", "Responsavel da OS atualizado.", null, os.getStatus());
        return OrdemServicoResponse.from(ordemServicoRepository.save(os));
    }

    @Transactional(readOnly = true)
    public OrdemServico buscarEntidade(UUID id) {
        return ordemServicoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ordem de servico nao encontrada."));
    }

    private void validarTransicao(StatusOS atual, StatusOS novo) {
        if (atual == novo) {
            return;
        }
        if (!TRANSICOES.getOrDefault(atual, Set.of()).contains(novo)) {
            throw new RegraNegocioException("Transicao de status invalida: " + atual + " para " + novo + ".");
        }
    }

    private void recalcularValorTotalEstimado(OrdemServico os) {
        if (os.getEstimativaHoras() == null || os.getCliente() == null || os.getCliente().getValorHora() == null) {
            os.setValorTotalEstimado(null);
            return;
        }

        os.setValorTotalEstimado(os.getEstimativaHoras().multiply(os.getCliente().getValorHora()));
    }
}
