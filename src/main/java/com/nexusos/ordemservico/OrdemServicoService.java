package com.nexusos.ordemservico;

import com.nexusos.auditoria.AuditoriaService;
import com.nexusos.cliente.ClienteService;
import com.nexusos.configuracao.ConfiguracaoOSService;
import com.nexusos.email.EmailService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.dto.AnaliseUpdateRequest;
import com.nexusos.ordemservico.dto.CancelamentoOrdemServicoRequest;
import com.nexusos.ordemservico.dto.CentralPendenciasResponse;
import com.nexusos.ordemservico.dto.OrdemServicoRequest;
import com.nexusos.ordemservico.dto.OrdemServicoResponse;
import com.nexusos.ordemservico.dto.OrdemServicoUpdateRequest;
import com.nexusos.ordemservico.dto.PrioridadeUpdateRequest;
import com.nexusos.ordemservico.dto.ResponsavelUpdateRequest;
import com.nexusos.ordemservico.dto.ReaberturaOrdemServicoRequest;
import com.nexusos.ordemservico.dto.SequenciaUpdateRequest;
import com.nexusos.ordemservico.dto.StatusUpdateRequest;
import com.nexusos.ordemservico.dto.TransicaoStatusResponse;
import com.nexusos.ordemservico.dto.VinculosUpdateRequest;
import com.nexusos.pagamento.ConfiguracaoPagamentoService;
import com.nexusos.projeto.ProjetoService;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import com.nexusos.whatsapp.WhatsappService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.LinkedHashSet;
import java.util.function.Predicate;
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
        TRANSICOES.put(StatusOS.CANCELADA, Set.of());
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
    private final ConfiguracaoOSService configuracaoOSService;
    private final ConfiguracaoPagamentoService configuracaoPagamentoService;

    @Transactional(readOnly = true)
    public List<OrdemServicoResponse> listar() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var email = authentication != null ? authentication.getName() : null;
        var desenvolvedor = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_DESENVOLVEDOR".equals(authority.getAuthority()));

        var ordens = desenvolvedor && email != null
                ? ordemServicoRepository.findByResponsavelEmailOrderByAtualizadoEmDesc(email)
                : ordemServicoRepository.findAllByOrderByAtualizadoEmDesc();

        var configuracao = configuracaoOSService.buscarEntidade();
        return ordens.stream()
                .map(ordem -> responder(ordem, desenvolvedor ? email : null,
                        desenvolvedor, configuracao != null && Boolean.TRUE.equals(configuracao.getExigirAnaliseAntesCliente()),
                        configuracao != null && Boolean.TRUE.equals(configuracao.getExigirAprovacaoAdminAntesCliente())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrdemServicoResponse buscarPorId(UUID id) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var email = authentication != null ? authentication.getName() : null;
        var desenvolvedor = ehDesenvolvedor();
        var configuracao = configuracaoOSService.buscarEntidade();
        return responder(buscarEntidade(id), desenvolvedor ? email : null, desenvolvedor,
                configuracao != null && Boolean.TRUE.equals(configuracao.getExigirAnaliseAntesCliente()),
                configuracao != null && Boolean.TRUE.equals(configuracao.getExigirAprovacaoAdminAntesCliente()));
    }

    @Transactional
    public OrdemServicoResponse criar(OrdemServicoRequest request) {
        var configuracao = configuracaoOSService.buscarEntidade();
        var cliente = clienteService.buscarEntidade(request.clienteId());
        var responsavel = request.responsavelId() != null
                ? usuarioService.buscarEntidade(request.responsavelId()) : configuracao.getResponsavelPadrao();
        if (responsavel == null && !Boolean.TRUE.equals(configuracao.getPermitirSemResponsavel())) {
            throw new RegraNegocioException("Informe um responsavel para o ticket.");
        }
        var prioridade = request.prioridade() != null ? request.prioridade() : configuracao.getPrioridadePadrao();
        var projeto = request.projetoId() != null ? projetoService.buscarEntidade(request.projetoId()) : null;
        validarProjetoDoCliente(projeto, cliente.getId());
        var idsVinculados = request.ordemServicoIds() == null ? Set.<UUID>of() : new LinkedHashSet<>(request.ordemServicoIds());
        var ordensVinculadas = ordemServicoRepository.findAllById(idsVinculados);
        if (ordensVinculadas.size() != idsVinculados.size()) {
            throw new RecursoNaoEncontradoException("Um ou mais tickets relacionados não foram encontrados.");
        }
        var os = OrdemServico.builder()
                .codigo(ordemServicoRepository.proximoCodigo())
                .titulo(request.titulo())
                .descricao(request.descricao())
                .cliente(cliente)
                .responsavel(responsavel)
                .projeto(projeto)
                .status(configuracao.getStatusInicial())
                .prioridade(prioridade)
                .prazo(request.prazo() != null ? request.prazo() : configuracaoOSService.calcularPrazo(prioridade))
                .estimativaHoras(request.estimativaHoras())
                .cobrar(Boolean.TRUE)
                .paga(Boolean.FALSE)
                .build();
        os.getOrdensVinculadas().addAll(ordensVinculadas);
        recalcularValorTotalEstimado(os);
        var salva = ordemServicoRepository.save(os);
        ordensVinculadas.forEach(vinculada -> {
            vinculada.getOrdensVinculadas().add(salva);
            ordemServicoRepository.save(vinculada);
        });
        auditoriaService.registrar(salva, responsavel, "CRIACAO", "Ticket criada.", null, salva.getStatus());
        if (!ordensVinculadas.isEmpty()) {
            auditoriaService.registrar(salva, responsavel, "VINCULOS",
                    "Tickets relacionados adicionados durante o cadastro.", null, salva.getStatus());
        }
        notificacaoService.notificarOsCriada(salva);
        notificacaoService.notificarAtribuicao(
                salva,
                "Uma novo ticket foi atribuida a voce: " + salva.getCodigo() + " - " + salva.getTitulo() + "."
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
        validarResponsavelObrigatorio(os.getResponsavel());
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
            salva.setSequenciaExecucao(null);
            notificacaoService.notificarResponsavelAlterado(salva, responsavelAnterior);
            if (salva.getResponsavel() != null) {
                notificacaoService.notificarAtribuicao(
                        salva,
                        "O ticket " + salva.getCodigo() + " foi direcionada para voce."
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
        var configuracao = configuracaoOSService.buscarEntidade();
        var statusDestino = request.status();
        if (request.status() == StatusOS.FINALIZADA && statusAnterior == StatusOS.EM_TESTE
                && Boolean.TRUE.equals(os.getCobrar()) && !Boolean.TRUE.equals(os.getPaga())
                && Boolean.TRUE.equals(configuracaoPagamentoService.buscarEntidade().getCobrarAutomaticamenteOsFinalizada())) {
            statusDestino = StatusOS.AGUARDANDO_PAGAMENTO;
        }
        if (request.status() == StatusOS.AGUARDANDO_APROVACAO
                && Boolean.TRUE.equals(configuracao.getExigirAprovacaoAdminAntesCliente()) && ehDesenvolvedor()) {
            throw new RegraNegocioException("A analise deve ser aprovada por um administrador antes de avancar o ticket.");
        }
        if (request.status() == StatusOS.AGUARDANDO_APROVACAO
                && Boolean.TRUE.equals(configuracao.getExigirAnaliseAntesCliente())) {
            validarAnalisePreenchida(os);
        }
        validarTransicao(statusAnterior, statusDestino);
        os.setStatus(statusDestino);
        if (statusDestino == StatusOS.FINALIZADA) {
            if (request.descricao() == null || request.descricao().isBlank()) {
                throw new RegraNegocioException("Informe o que foi feito antes de finalizar o ticket.");
            }
            os.setFinalizadoEm(OffsetDateTime.now());
            os.setDescricaoFinalizacao(request.descricao().trim());
            os.setCommitsFinalizacao(limparTextoOpcional(request.commitsFinalizacao()));
            os.setBranchFinalizacao(limparTextoOpcional(request.branchFinalizacao()));
            os.setArquivosAlteradosFinalizacao(limparTextoOpcional(request.arquivosAlteradosFinalizacao()));
        }
        if (statusDestino != StatusOS.FINALIZADA) {
            os.setFinalizadoEm(null);
            os.setDescricaoFinalizacao(null);
            os.setCommitsFinalizacao(null);
            os.setBranchFinalizacao(null);
            os.setArquivosAlteradosFinalizacao(null);
        }
        var usuario = usuarioService.buscarAutenticado();
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, usuario, "ALTERACAO_STATUS",
                request.descricao() != null ? request.descricao() : "Status do ticket alterado.",
                statusAnterior, statusDestino);
        notificacaoService.notificarStatus(salva);
        if (statusDestino == StatusOS.FINALIZADA) {
            emailService.enviarOrdemServicoFinalizada(salva);
            whatsappService.enviarOrdemServicoFinalizada(salva);
        }
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse reabrir(UUID id, ReaberturaOrdemServicoRequest request) {
        var os = buscarEntidade(id);
        if (os.getStatus() != StatusOS.FINALIZADA) {
            throw new RegraNegocioException("Somente um ticket finalizado pode ser reaberto.");
        }

        var motivo = request.motivo().trim();
        var administrador = usuarioService.buscarAutenticado();
        os.setStatus(StatusOS.EM_DESENVOLVIMENTO);
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, administrador, "REABERTURA",
                "Ticket reaberto. Motivo: " + motivo, StatusOS.FINALIZADA, StatusOS.EM_DESENVOLVIMENTO);
        notificacaoService.notificarReabertura(salva, motivo);
        return OrdemServicoResponse.from(salva);
    }

    @Transactional(readOnly = true)
    public CentralPendenciasResponse listarPendencias() {
        var hoje = LocalDate.now();
        var ordens = ordemServicoRepository.buscarParaCentralPendencias();
        var ordenacao = Comparator.comparing(OrdemServico::getPrazo,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(OrdemServico::getCodigo);

        return new CentralPendenciasResponse(
                filtrarPendencias(ordens,
                        os -> ativa(os) && os.getPrazo() != null && os.getPrazo().isBefore(hoje), ordenacao),
                filtrarPendencias(ordens, os -> ativa(os) && hoje.equals(os.getPrazo()), ordenacao),
                filtrarPendencias(ordens, os -> ativa(os) && os.getResponsavel() == null, ordenacao),
                filtrarPendencias(ordens, os -> os.getStatus() == StatusOS.RECEBIDA, ordenacao),
                filtrarPendencias(ordens, os -> os.getStatus() == StatusOS.AGUARDANDO_APROVACAO, ordenacao),
                filtrarPendencias(ordens, os -> os.getStatus() == StatusOS.AGUARDANDO_PAGAMENTO
                        && !Boolean.TRUE.equals(os.getPaga()), ordenacao),
                filtrarPendencias(ordens, os -> Boolean.FALSE.equals(os.getAprovadaPeloCliente()), ordenacao)
        );
    }

    private List<OrdemServicoResponse> filtrarPendencias(
            List<OrdemServico> ordens,
            Predicate<OrdemServico> filtro,
            Comparator<OrdemServico> ordenacao) {
        return ordens.stream().filter(filtro).sorted(ordenacao).map(OrdemServicoResponse::from).toList();
    }

    private boolean ativa(OrdemServico ordem) {
        return ordem.getStatus() != StatusOS.FINALIZADA && ordem.getStatus() != StatusOS.CANCELADA;
    }

    @Transactional
    public OrdemServicoResponse cancelar(UUID id, CancelamentoOrdemServicoRequest request) {
        var os = buscarEntidade(id);
        if (os.getStatus() == StatusOS.FINALIZADA) {
            throw new RegraNegocioException("Um ticket finalizado não pode ser cancelado.");
        }
        if (os.getStatus() == StatusOS.CANCELADA) {
            throw new RegraNegocioException("O ticket já está cancelado.");
        }

        var statusAnterior = os.getStatus();
        var motivo = request.motivo().trim();
        var administrador = usuarioService.buscarAutenticado();
        os.setStatus(StatusOS.CANCELADA);
        os.setSequenciaExecucao(null);
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, administrador, "CANCELAMENTO",
                "Ticket cancelado. Motivo: " + motivo, statusAnterior, StatusOS.CANCELADA);
        notificacaoService.notificarStatus(salva);
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarAnalise(UUID id, AnaliseUpdateRequest request) {
        var os = buscarEntidade(id);
        var statusAnterior = os.getStatus();
        var iniciandoAnalise = statusAnterior == StatusOS.RECEBIDA;
        if (!iniciandoAnalise && statusAnterior != StatusOS.EM_ANALISE) {
            throw new RegraNegocioException("A analise so pode ser alterada em tickets recebidos ou em analise.");
        }
        var desenvolvedor = ehDesenvolvedor();
        if (!desenvolvedor) {
            os.setEntendimento(request.entendimento());
            os.setImpacto(request.impacto());
            os.setRiscos(request.riscos());
            os.setCobrar(request.cobrar() == null ? Boolean.TRUE : request.cobrar());
            if (!Boolean.TRUE.equals(os.getCobrar())
                    && !Boolean.TRUE.equals(configuracaoPagamentoService.buscarEntidade().getPermitirOsSemCobranca())) {
                throw new RegraNegocioException("A configuracao atual nao permite ticket sem cobranca.");
            }
        }
        os.setEstimativaHoras(request.estimativaHoras());

        var exigeAprovacaoAdmin = false;
        if (desenvolvedor) {
            var configuracao = configuracaoOSService.buscarEntidade();
            exigeAprovacaoAdmin = configuracao == null
                    || Boolean.TRUE.equals(configuracao.getExigirAprovacaoAdminAntesCliente());
        }
        var analiseCompleta = !textoVazio(os.getEntendimento()) && os.getEstimativaHoras() != null;
        var enviarParaAprovacao = !desenvolvedor || (!exigeAprovacaoAdmin && analiseCompleta);

        if (enviarParaAprovacao) {
            validarAnalisePreenchida(os);
            os.setStatus(StatusOS.AGUARDANDO_APROVACAO);
        } else {
            os.setStatus(StatusOS.EM_ANALISE);
        }
        recalcularValorTotalEstimado(os);
        var salva = ordemServicoRepository.save(os);
        if (iniciandoAnalise) {
            auditoriaService.registrar(salva, salva.getResponsavel(), "ALTERACAO_STATUS",
                    "Análise iniciada ao salvar as primeiras informações.", StatusOS.RECEBIDA, StatusOS.EM_ANALISE);
        }
        auditoriaService.registrar(salva, salva.getResponsavel(), "ANALISE",
                desenvolvedor ? "Estimativa de horas informada pelo desenvolvedor." : "Análise técnica concluída.",
                null, salva.getStatus());
        if (enviarParaAprovacao) {
            auditoriaService.registrar(salva, salva.getResponsavel(), "ALTERACAO_STATUS",
                    "Análise concluída e enviada automaticamente para aprovação.",
                    StatusOS.EM_ANALISE, StatusOS.AGUARDANDO_APROVACAO);
            notificacaoService.notificarStatus(salva);
            emailService.enviarOrdemServicoAnalisada(salva);
            whatsappService.enviarOrdemServicoAnalisada(salva);
        } else if (iniciandoAnalise) {
            notificacaoService.notificarStatus(salva);
        }
        return OrdemServicoResponse.from(salva);
    }

    private boolean ehDesenvolvedor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_DESENVOLVEDOR".equals(authority.getAuthority()));
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
            throw new RegraNegocioException("Ticket nao esta aguardando aprovacao do cliente.");
        }

        os.setAprovadaPeloCliente(aprovado);
        os.setAprovadoPeloClienteEm(OffsetDateTime.now());
        os.setObservacaoAprovacaoCliente(observacao);
        os.setStatus(aprovado ? StatusOS.APROVADA : StatusOS.EM_ANALISE);
        auditoriaService.registrar(os, os.getResponsavel(), aprovado ? "APROVACAO_CLIENTE" : "REPROVACAO_CLIENTE",
                aprovado ? "Ticket aprovado pelo cliente." : "Ticket reprovado pelo cliente.", StatusOS.AGUARDANDO_APROVACAO, os.getStatus());
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
        os.setSequenciaExecucao(null);
        auditoriaService.registrar(os, responsavel, "RESPONSAVEL", "Responsável do ticket atualizado.", null, os.getStatus());
        var salva = ordemServicoRepository.save(os);
        notificacaoService.notificarResponsavelAlterado(salva, responsavelAnterior);
        notificacaoService.notificarAtribuicao(
                salva,
                "O ticket " + salva.getCodigo() + " foi direcionada para voce."
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
    public List<OrdemServicoResponse> atualizarSequencia(UUID id, SequenciaUpdateRequest request) {
        var os = buscarEntidade(id);
        if (os.getResponsavel() == null || os.getStatus() == StatusOS.FINALIZADA) {
            throw new RegraNegocioException("Somente tickets abertos e atribuidas podem ser reordenadas.");
        }

        var fila = ordemServicoRepository.findFilaByResponsavelId(os.getResponsavel().getId(), StatusOS.FINALIZADA);
        var indiceAtual = fila.indexOf(os);
        if (indiceAtual < 0) {
            throw new RegraNegocioException("O ticket nao pertence a fila informada.");
        }
        if (request.posicao() > fila.size()) {
            throw new RegraNegocioException("A posicao deve estar entre 1 e " + fila.size() + ".");
        }

        fila.remove(indiceAtual);
        fila.add(request.posicao() - 1, os);
        for (int indice = 0; indice < fila.size(); indice++) {
            fila.get(indice).setSequenciaExecucao((long) indice + 1);
        }
        ordemServicoRepository.saveAll(fila);
        return fila.stream().map(OrdemServicoResponse::from).toList();
    }

    @Transactional
    public OrdemServicoResponse atualizarPagamento(UUID id, boolean paga) {
        var os = buscarEntidade(id);
        os.setPaga(paga);
        auditoriaService.registrar(os, os.getResponsavel(), "PAGAMENTO",
                paga ? "Ticket marcada como paga." : "Ticket marcada como nao paga.", null, os.getStatus());
        var salva = ordemServicoRepository.save(os);
        notificacaoService.notificarPagamento(salva, paga);
        return OrdemServicoResponse.from(salva);
    }

    @Transactional
    public OrdemServicoResponse atualizarVinculos(UUID id, VinculosUpdateRequest request) {
        var os = buscarEntidade(id);
        if (request.ordemServicoIds().contains(id)) {
            throw new RegraNegocioException("Umo ticket nao pode ser vinculada a ela mesma.");
        }

        var novasVinculadas = new LinkedHashSet<>(ordemServicoRepository.findAllById(request.ordemServicoIds()));
        if (novasVinculadas.size() != request.ordemServicoIds().size()) {
            throw new RecursoNaoEncontradoException("Uma ou mais tickets vinculados nao foram encontradas.");
        }

        var anteriores = new LinkedHashSet<>(os.getOrdensVinculadas());
        anteriores.stream().filter(anterior -> !novasVinculadas.contains(anterior)).forEach(anterior -> {
            anterior.getOrdensVinculadas().remove(os);
            ordemServicoRepository.save(anterior);
        });
        novasVinculadas.forEach(vinculada -> {
            vinculada.getOrdensVinculadas().add(os);
            ordemServicoRepository.save(vinculada);
        });
        os.getOrdensVinculadas().clear();
        os.getOrdensVinculadas().addAll(novasVinculadas);
        var salva = ordemServicoRepository.save(os);
        auditoriaService.registrar(salva, salva.getResponsavel(), "VINCULOS",
                "Vinculos entre tickets atualizados.", null, salva.getStatus());
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

        return ordem.orElseThrow(() -> new RecursoNaoEncontradoException("Ticket nao encontrada."));
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

    @Transactional
    public OrdemServicoResponse assumir(UUID id) {
        var os = buscarEntidade(id);
        var usuario = usuarioService.buscarAutenticado();
        if (os.getResponsavel() != null) {
            throw new RegraNegocioException("Este ticket ja possui responsavel.");
        }
        os.setResponsavel(usuario);
        os.setSequenciaExecucao(null);
        auditoriaService.registrar(os, usuario, "RESPONSAVEL", "Ticket assumida pelo usuario autenticado.",
                null, os.getStatus());
        var salva = ordemServicoRepository.save(os);
        notificacaoService.notificarAtribuicao(salva, "Voce assumiu o ticket.");
        return OrdemServicoResponse.from(salva);
    }

    private OrdemServicoResponse responder(OrdemServico os, String emailResponsavelVisivel,
            boolean desenvolvedor, boolean exigirAnalise, boolean exigirAprovacaoAdmin) {
        var destinosBase = TRANSICOES.getOrDefault(os.getStatus(), Set.of());
        var transicoes = java.util.Arrays.stream(StatusOS.values())
                .filter(status -> status != os.getStatus())
                .map(status -> descreverTransicao(os, status, destinosBase, desenvolvedor,
                        exigirAnalise, exigirAprovacaoAdmin))
                .toList();
        return OrdemServicoResponse.from(os, emailResponsavelVisivel).withTransicoesStatus(transicoes);
    }

    private TransicaoStatusResponse descreverTransicao(OrdemServico os, StatusOS destino,
            Set<StatusOS> destinosBase, boolean desenvolvedor, boolean exigirAnalise,
            boolean exigirAprovacaoAdmin) {
        if (!destinosBase.contains(destino)) {
            var motivo = os.getStatus() == StatusOS.RECEBIDA
                    ? "Este ticket precisa passar por analise antes."
                    : "Esta etapa nao permite mover diretamente para o status selecionado.";
            return new TransicaoStatusResponse(destino, false, motivo);
        }
        if (destino == StatusOS.AGUARDANDO_APROVACAO && exigirAprovacaoAdmin && desenvolvedor) {
            return new TransicaoStatusResponse(destino, false,
                    "Aguardando aprovacao do administrador.");
        }
        if (destino == StatusOS.AGUARDANDO_APROVACAO && exigirAnalise
                && (textoVazio(os.getEntendimento()) || os.getEstimativaHoras() == null)) {
            return new TransicaoStatusResponse(destino, false,
                    "Este ticket precisa ter a analise preenchida antes.");
        }
        return new TransicaoStatusResponse(destino, true, null);
    }

    private void validarResponsavelObrigatorio(Usuario responsavel) {
        if (responsavel == null && !Boolean.TRUE.equals(configuracaoOSService.buscarEntidade().getPermitirSemResponsavel())) {
            throw new RegraNegocioException("A configuração atual não permite ticket sem responsável.");
        }
    }

    private void validarAnalisePreenchida(OrdemServico os) {
        if (textoVazio(os.getEntendimento()) || os.getEstimativaHoras() == null) {
            throw new RegraNegocioException("Preencha o texto da análise e a estimativa antes de enviar ao cliente.");
        }
    }

    private boolean textoVazio(String valor) {
        return valor == null || valor.isBlank();
    }
}
