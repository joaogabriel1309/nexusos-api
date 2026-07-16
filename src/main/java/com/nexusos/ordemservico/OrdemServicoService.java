package com.nexusos.ordemservico;

import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.cliente.ClienteService;
import com.nexusos.email.EmailService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import com.nexusos.ordemservico.dto.OrdemServicoRequest;
import com.nexusos.ordemservico.dto.OrdemServicoResponse;
import com.nexusos.ordemservico.dto.OrdemServicoUpdateRequest;
import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.ordemservico.dto.ResponsavelUpdateRequest;
import com.nexusos.ordemservico.dto.StatusUpdateRequest;
import com.nexusos.projeto.ProjetoService;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import com.nexusos.whatsapp.WhatsappService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrdemServicoService {

    private static final Map<StatusOS, Set<StatusOS>> TRANSICOES = new EnumMap<>(StatusOS.class);

    static {
        TRANSICOES.put(StatusOS.RECEBIDA, Set.of(StatusOS.EM_ANALISE));
        TRANSICOES.put(StatusOS.EM_ANALISE, Set.of(StatusOS.AGUARDANDO_APROVACAO));
        TRANSICOES.put(StatusOS.AGUARDANDO_APROVACAO, Set.of(StatusOS.APROVADA, StatusOS.EM_ANALISE));
        TRANSICOES.put(StatusOS.APROVADA, Set.of(StatusOS.EM_DESENVOLVIMENTO));
        TRANSICOES.put(StatusOS.EM_DESENVOLVIMENTO, Set.of(StatusOS.EM_TESTE));
        TRANSICOES.put(StatusOS.EM_TESTE, Set.of(StatusOS.AGUARDANDO_PAGAMENTO, StatusOS.EM_DESENVOLVIMENTO));
        TRANSICOES.put(StatusOS.AGUARDANDO_PAGAMENTO, Set.of(StatusOS.FINALIZADA, StatusOS.EM_DESENVOLVIMENTO));
        TRANSICOES.put(StatusOS.FINALIZADA, Set.of());
    }

    private final OrdemServicoRepository ordemServicoRepository;
    private final ClienteService clienteService;
    private final ProjetoService projetoService;
    private final UsuarioService usuarioService;
    private final AuditoriaService auditoriaService;
    private final EmailService emailService;
    private final WhatsappService whatsappService;
    private final NotificacaoService notificacaoService;
    private final SlaPrioridadeService slaPrioridadeService;

    @Transactional(readOnly = true)
    public List<OrdemServicoResponse> listar() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var email = authentication != null ? authentication.getName() : null;
        var desenvolvedor = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_DESENVOLVEDOR".equals(authority.getAuthority()));

        var ordens = desenvolvedor && email != null
                ? ordemServicoRepository.findByResponsavelEmailOrderByAtualizadoEmDesc(email)
                : ordemServicoRepository.findAllByOrderByAtualizadoEmDesc();

        return ordens.stream().map(OrdemServicoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrdemServicoResponse buscarPorId(UUID id) {
        return OrdemServicoResponse.from(buscarEntidade(id));
    }

    @Transactional
    public OrdemServicoResponse criar(OrdemServicoRequest request) {
        var cliente = clienteService.buscarEntidade(request.clienteId());
        var responsavel = request.responsavelId() != null ? usuarioService.buscarEntidade(request.responsavelId()) : null;
        var projeto = request.projetoId() != null ? projetoService.buscarEntidade(request.projetoId()) : null;
        validarProjetoDoCliente(projeto, cliente.getId());
        var os = OrdemServico.builder()
                .codigo(ordemServicoRepository.proximoCodigo())
                .titulo(request.titulo())
                .descricao(request.descricao())
                .cliente(cliente)
                .responsavel(responsavel)
                .projeto(projeto)
                .status(StatusOS.RECEBIDA)
                .prioridade(request.prioridade())
                .prazo(request.prazo() != null ? request.prazo() : slaPrioridadeService.calcularPrazo(request.prioridade()))
                .estimativaHoras(request.estimativaHoras())
                .cobrar(Boolean.TRUE)
                .paga(Boolean.FALSE)
                .build();
        recalcularValorTotalEstimado(os);
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, responsavel, "CRIACAO", "Ordem de servico criada.", null, salva.getStatus());
        notificacaoService.notificarOsCriada(salva);
        notificacaoService.notificarAtribuicao(
                salva,
                "Uma nova OS foi atribuida a voce: " + salva.getCodigo() + " - " + salva.getTitulo() + "."
        );
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizar(UUID id, OrdemServicoUpdateRequest request) {
        var os = buscarEntidade(id);
        var responsavelAnterior = os.getResponsavel();
        var responsavelAnteriorId = responsavelAnterior != null ? responsavelAnterior.getId() : null;
        var prioridadeAnterior = os.getPrioridade();
        var prazoAnterior = os.getPrazo();
        os.setTitulo(request.titulo());
        os.setDescricao(request.descricao());
        os.setCliente(clienteService.buscarEntidade(request.clienteId()));
        os.setResponsavel(request.responsavelId() != null ? usuarioService.buscarEntidade(request.responsavelId()) : null);
        var projeto = request.projetoId() != null ? projetoService.buscarEntidade(request.projetoId()) : null;
        validarProjetoDoCliente(projeto, os.getCliente().getId());
        os.setProjeto(projeto);
        os.setPrioridade(request.prioridade());
        os.setPrazo(request.prazo() != null
                ? request.prazo()
                : prioridadeAnterior != request.prioridade() && prazoAnterior == null
                        ? slaPrioridadeService.calcularPrazo(request.prioridade())
                        : null);
        os.setEntendimento(request.entendimento());
        os.setImpacto(request.impacto());
        os.setRiscos(request.riscos());
        os.setEstimativaHoras(request.estimativaHoras());
        recalcularValorTotalEstimado(os);
        var salva = ordemServicoRepository.save(os);

        var responsavelAtualId = salva.getResponsavel() != null ? salva.getResponsavel().getId() : null;
        var responsavelAlterado = responsavelAnteriorId == null
                ? responsavelAtualId != null
                : !responsavelAnteriorId.equals(responsavelAtualId);
        if (responsavelAlterado) {
            notificacaoService.notificarResponsavelAlterado(salva, responsavelAnterior);
            if (salva.getResponsavel() != null) {
                notificacaoService.notificarAtribuicao(
                        salva,
                        "A OS " + salva.getCodigo() + " foi direcionada para voce."
                );
            }
        }
        if (prioridadeAnterior != salva.getPrioridade()) {
            notificacaoService.notificarPrioridadeAlterada(salva);
        }
        if ((prazoAnterior == null && salva.getPrazo() != null) || (prazoAnterior != null && !prazoAnterior.equals(salva.getPrazo()))) {
            notificacaoService.notificarPrazoAlterado(salva);
        }

        return OrdemServicoResponse.from(salva);
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
            if (request.descricao() == null || request.descricao().isBlank()) {
                throw new RegraNegocioException("Informe o que foi feito antes de finalizar a OS.");
            }
            os.setFinalizadoEm(OffsetDateTime.now());
            os.setDescricaoFinalizacao(request.descricao().trim());
            os.setCommitsFinalizacao(limparTextoOpcional(request.commitsFinalizacao()));
            os.setBranchFinalizacao(limparTextoOpcional(request.branchFinalizacao()));
            os.setArquivosAlteradosFinalizacao(limparTextoOpcional(request.arquivosAlteradosFinalizacao()));
        }
        if (request.status() != StatusOS.FINALIZADA) {
            os.setFinalizadoEm(null);
            os.setDescricaoFinalizacao(null);
            os.setCommitsFinalizacao(null);
            os.setBranchFinalizacao(null);
            os.setArquivosAlteradosFinalizacao(null);
        }
        var usuario = request.usuarioId() != null ? usuarioService.buscarEntidade(request.usuarioId()) : null;
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, usuario, "ALTERACAO_STATUS",
                request.descricao() != null ? request.descricao() : "Status da OS alterado.",
                statusAnterior, request.status());
        notificacaoService.notificarStatus(salva);
        if (request.status() == StatusOS.FINALIZADA) {
            emailService.enviarOrdemServicoFinalizada(salva);
            whatsappService.enviarOrdemServicoFinalizada(salva);
        }
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarAnalise(UUID id, AnaliseUpdateRequest request) {
        var os = buscarEntidade(id);
        os.setEntendimento(request.entendimento());
        os.setImpacto(request.impacto());
        os.setRiscos(request.riscos());
        os.setEstimativaHoras(request.estimativaHoras());
        os.setCobrar(request.cobrar() == null ? Boolean.TRUE : request.cobrar());
        recalcularValorTotalEstimado(os);
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, salva.getResponsavel(), "ANALISE", "Analise tecnica atualizada.", null, salva.getStatus());
        emailService.enviarOrdemServicoAnalisada(salva);
        whatsappService.enviarOrdemServicoAnalisada(salva);
        return OrdemServicoResponse.from(salva);
    }

    @Transactional(readOnly = true)
    public List<OrdemServicoResponse> listarPorCliente(UUID clienteId) {
        return ordemServicoRepository.findByClienteIdOrderByAtualizadoEmDesc(clienteId).stream()
                .map(OrdemServicoResponse::from)
                .toList();
    }

    @Transactional
    public OrdemServicoResponse registrarAprovacaoCliente(UUID id, boolean aprovado, String observacao) {
        var os = buscarEntidade(id);
        if (os.getStatus() != StatusOS.AGUARDANDO_APROVACAO) {
            throw new RegraNegocioException("OS nao esta aguardando aprovacao do cliente.");
        }

        os.setAprovadaPeloCliente(aprovado);
        os.setAprovadoPeloClienteEm(OffsetDateTime.now());
        os.setObservacaoAprovacaoCliente(observacao);
        os.setStatus(aprovado ? StatusOS.APROVADA : StatusOS.EM_ANALISE);
        auditoriaService.registrar(os, os.getResponsavel(), aprovado ? "APROVACAO_CLIENTE" : "REPROVACAO_CLIENTE",
                aprovado ? "OS aprovada pelo cliente." : "OS reprovada pelo cliente.", StatusOS.AGUARDANDO_APROVACAO, os.getStatus());
        var salva = ordemServicoRepository.save(os);
        notificacaoService.notificarAprovacaoCliente(salva, aprovado);
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarResponsavel(UUID id, ResponsavelUpdateRequest request) {
        var os = buscarEntidade(id);
        var responsavelAnterior = os.getResponsavel();
        Usuario responsavel = usuarioService.buscarEntidade(request.responsavelId());
        os.setResponsavel(responsavel);
        auditoriaService.registrar(os, responsavel, "RESPONSAVEL", "Responsavel da OS atualizado.", null, os.getStatus());
        var salva = ordemServicoRepository.save(os);
        notificacaoService.notificarResponsavelAlterado(salva, responsavelAnterior);
        notificacaoService.notificarAtribuicao(
                salva,
                "A OS " + salva.getCodigo() + " foi direcionada para voce."
        );
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarPrioridade(UUID id, PrioridadeUpdateRequest request) {
        var os = buscarEntidade(id);
        var prioridadeAnterior = os.getPrioridade();
        os.setPrioridade(request.prioridade());
        if (os.getPrazo() == null && prioridadeAnterior != request.prioridade()) {
            os.setPrazo(slaPrioridadeService.calcularPrazo(request.prioridade()));
        }
        var salva = ordemServicoRepository.save(os);
        if (prioridadeAnterior != salva.getPrioridade()) {
            notificacaoService.notificarPrioridadeAlterada(salva);
        }
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarPagamento(UUID id, boolean paga) {
        var os = buscarEntidade(id);
        os.setPaga(paga);
        auditoriaService.registrar(os, os.getResponsavel(), "PAGAMENTO",
                paga ? "OS marcada como paga." : "OS marcada como nao paga.", null, os.getStatus());
        var salva = ordemServicoRepository.save(os);
        notificacaoService.notificarPagamento(salva, paga);
        return OrdemServicoResponse.from(salva);
    }

    @Transactional(readOnly = true)
    public OrdemServico buscarEntidade(UUID id) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var email = authentication != null ? authentication.getName() : null;
        var desenvolvedor = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_DESENVOLVEDOR".equals(authority.getAuthority()));

        var ordem = desenvolvedor && email != null
                ? ordemServicoRepository.findByIdAndResponsavelEmail(id, email)
                : ordemServicoRepository.findById(id);

        return ordem.orElseThrow(() -> new RecursoNaoEncontradoException("Ordem de servico nao encontrada."));
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
        if (!Boolean.TRUE.equals(os.getCobrar())) {
            os.setValorTotalEstimado(BigDecimal.ZERO);
            return;
        }

        if (os.getEstimativaHoras() == null || os.getCliente() == null || os.getCliente().getValorHora() == null) {
            os.setValorTotalEstimado(null);
            return;
        }

        os.setValorTotalEstimado(os.getEstimativaHoras().multiply(os.getCliente().getValorHora()));
    }

    private void validarProjetoDoCliente(com.nexusos.projeto.Projeto projeto, UUID clienteId) {
        if (projeto != null && projeto.getCliente() != null && !projeto.getCliente().getId().equals(clienteId)) {
            throw new RegraNegocioException("Projeto nao pertence ao cliente informado.");
        }
    }

    private String limparTextoOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
