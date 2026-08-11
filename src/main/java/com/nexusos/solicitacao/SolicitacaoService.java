package com.nexusos.solicitacao;

import com.nexusos.cliente.ClienteService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.ordemservico.PrioridadeOS;
import com.nexusos.ordemservico.dto.OrdemServicoRequest;
import com.nexusos.solicitacao.dto.AuditoriaSolicitacaoResponse;
import com.nexusos.solicitacao.dto.SolicitacaoAnexoResponse;
import com.nexusos.solicitacao.dto.SolicitacaoContagemResponse;
import com.nexusos.solicitacao.dto.SolicitacaoConversaoRequest;
import com.nexusos.solicitacao.dto.SolicitacaoDetalheResponse;
import com.nexusos.solicitacao.dto.SolicitacaoInteracaoResponse;
import com.nexusos.solicitacao.dto.SolicitacaoRejeicaoRequest;
import com.nexusos.solicitacao.dto.SolicitacaoResumoResponse;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.UsuarioService;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class SolicitacaoService {
    private static final Set<StatusSolicitacao> STATUS_PENDENTES =
            EnumSet.of(StatusSolicitacao.NOVA, StatusSolicitacao.EM_ANALISE);
    private static final Set<StatusSolicitacao> STATUS_ENCERRADOS =
            EnumSet.of(StatusSolicitacao.REJEITADA, StatusSolicitacao.CONVERTIDA_EM_TICKET);

    private final SolicitacaoRepository repository;
    private final InteracaoSolicitacaoRepository interacaoRepository;
    private final ClienteService clienteService;
    private final UsuarioService usuarioService;
    private final SolicitacaoAnexoService anexoService;
    private final SolicitacaoAuditoriaService auditoriaService;
    private final OrdemServicoService ordemServicoService;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<SolicitacaoResumoResponse> listar() {
        return repository.findAllByOrderByAtualizadoEmDesc().stream()
                .map(SolicitacaoResumoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SolicitacaoContagemResponse contarPendentes() {
        return new SolicitacaoContagemResponse(repository.countByStatusIn(STATUS_PENDENTES));
    }

    @Transactional(readOnly = true)
    public SolicitacaoDetalheResponse buscar(UUID id) {
        return detalhar(buscarEntidade(id), true);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResumoResponse> listarPortal(String token) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        return repository.findByClienteIdOrderByAtualizadoEmDesc(cliente.getId()).stream()
                .map(SolicitacaoResumoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SolicitacaoDetalheResponse buscarPortal(String token, UUID id) {
        return detalhar(buscarAutorizada(token, id), false);
    }

    @Transactional
    public SolicitacaoDetalheResponse criarPortal(String token, String titulo, String descricao,
            PrioridadeOS prioridade, List<MultipartFile> arquivos) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        validarTexto(titulo, descricao);
        if (prioridade == PrioridadeOS.CRITICA) {
            throw new RegraNegocioException("A urgencia critica e definida pela equipe durante a analise.");
        }

        var solicitacao = Solicitacao.builder()
                .codigo(repository.proximoCodigo())
                .titulo(titulo.trim())
                .descricao(descricao.trim())
                .cliente(cliente)
                .prioridade(prioridade)
                .status(StatusSolicitacao.NOVA)
                .build();
        var salva = repository.save(solicitacao);
        adicionarInteracao(salva, null, OrigemSolicitacao.SISTEMA,
                "Solicitacao recebida. A equipe fara a triagem em breve.");
        anexoService.salvarTodos(salva, null, arquivos, true);
        auditoriaService.registrar(salva, null, OrigemSolicitacao.CLIENTE, "CRIACAO",
                "Solicitacao criada pelo Portal do Cliente.", null, StatusSolicitacao.NOVA);
        notificacaoService.notificarSolicitacaoNova(salva);
        return detalhar(salva, false);
    }

    @Transactional
    public SolicitacaoDetalheResponse assumir(UUID id) {
        var solicitacao = buscarParaAtualizacao(id);
        validarAberta(solicitacao);
        var usuario = usuarioService.buscarAutenticado();
        var anterior = solicitacao.getStatus();
        solicitacao.setResponsavel(usuario);
        if (anterior == StatusSolicitacao.NOVA) {
            solicitacao.setStatus(StatusSolicitacao.EM_ANALISE);
            adicionarInteracao(solicitacao, usuario, OrigemSolicitacao.SISTEMA,
                    "A equipe iniciou a analise da solicitacao.");
        }
        repository.save(solicitacao);
        auditoriaService.registrar(solicitacao, usuario, OrigemSolicitacao.EQUIPE, "ATRIBUICAO",
                "Solicitacao assumida por " + usuario.getNome() + ".", anterior, solicitacao.getStatus());
        return detalhar(solicitacao, true);
    }

    @Transactional
    public SolicitacaoDetalheResponse atualizarResponsavel(UUID id, UUID responsavelId) {
        var solicitacao = buscarParaAtualizacao(id);
        validarAberta(solicitacao);
        var administrador = usuarioService.buscarAutenticado();
        var anterior = solicitacao.getStatus();
        var responsavel = responsavelId != null ? usuarioService.buscarEntidade(responsavelId) : null;
        if (responsavel != null && responsavel.getPerfil() != PerfilUsuario.ADMIN) {
            throw new RegraNegocioException("A triagem deve ser atribuida a um administrador.");
        }
        solicitacao.setResponsavel(responsavel);
        if (responsavel != null && anterior == StatusSolicitacao.NOVA) {
            solicitacao.setStatus(StatusSolicitacao.EM_ANALISE);
            adicionarInteracao(solicitacao, administrador, OrigemSolicitacao.SISTEMA,
                    "A equipe iniciou a analise da solicitacao.");
        }
        repository.save(solicitacao);
        auditoriaService.registrar(solicitacao, administrador, OrigemSolicitacao.EQUIPE, "RESPONSAVEL",
                responsavel != null ? "Responsavel definido: " + responsavel.getNome() + "."
                        : "Responsavel removido.", anterior, solicitacao.getStatus());
        return detalhar(solicitacao, true);
    }

    @Transactional
    public SolicitacaoDetalheResponse solicitarEsclarecimentos(UUID id, String mensagem) {
        var solicitacao = buscarParaAtualizacao(id);
        validarAberta(solicitacao);
        var usuario = usuarioService.buscarAutenticado();
        var anterior = solicitacao.getStatus();
        if (solicitacao.getResponsavel() == null) {
            solicitacao.setResponsavel(usuario);
        }
        solicitacao.setStatus(StatusSolicitacao.AGUARDANDO_CLIENTE);
        adicionarInteracao(solicitacao, usuario, OrigemSolicitacao.EQUIPE, normalizarMensagem(mensagem));
        repository.save(solicitacao);
        auditoriaService.registrar(solicitacao, usuario, OrigemSolicitacao.EQUIPE, "ESCLARECIMENTO",
                "A equipe solicitou esclarecimentos ao cliente.", anterior, solicitacao.getStatus());
        return detalhar(solicitacao, true);
    }

    @Transactional
    public SolicitacaoDetalheResponse responderPortal(String token, UUID id, String mensagem,
            List<MultipartFile> arquivos) {
        var solicitacao = buscarAutorizadaParaAtualizacao(token, id);
        validarAberta(solicitacao);
        var anterior = solicitacao.getStatus();
        var interacao = adicionarInteracao(solicitacao, null, OrigemSolicitacao.CLIENTE,
                normalizarMensagem(mensagem));
        anexoService.salvarTodos(solicitacao, interacao, arquivos, true);
        if (anterior == StatusSolicitacao.AGUARDANDO_CLIENTE) {
            solicitacao.setStatus(StatusSolicitacao.EM_ANALISE);
        }
        repository.save(solicitacao);
        auditoriaService.registrar(solicitacao, null, OrigemSolicitacao.CLIENTE, "RESPOSTA_CLIENTE",
                "Cliente respondeu pela conversa da solicitacao.", anterior, solicitacao.getStatus());
        notificacaoService.notificarRespostaSolicitacao(solicitacao);
        return detalhar(solicitacao, false);
    }

    @Transactional
    public SolicitacaoDetalheResponse rejeitar(UUID id, SolicitacaoRejeicaoRequest request) {
        var solicitacao = buscarParaAtualizacao(id);
        validarAberta(solicitacao);
        var usuario = usuarioService.buscarAutenticado();
        var anterior = solicitacao.getStatus();
        solicitacao.setStatus(StatusSolicitacao.REJEITADA);
        solicitacao.setMotivoRejeicao(request.motivo());
        solicitacao.setDetalheRejeicao(request.detalhe().trim());
        adicionarInteracao(solicitacao, usuario, OrigemSolicitacao.SISTEMA,
                "Solicitacao encerrada. Motivo: " + request.detalhe().trim());
        repository.save(solicitacao);
        auditoriaService.registrar(solicitacao, usuario, OrigemSolicitacao.EQUIPE, "REJEICAO",
                "Solicitacao rejeitada: " + request.motivo() + ".", anterior, solicitacao.getStatus());
        return detalhar(solicitacao, true);
    }

    @Transactional
    public SolicitacaoDetalheResponse converter(UUID id, SolicitacaoConversaoRequest request) {
        var solicitacao = buscarParaAtualizacao(id);
        if (solicitacao.getStatus() == StatusSolicitacao.CONVERTIDA_EM_TICKET
                && solicitacao.getOrdemServico() != null) {
            return detalhar(solicitacao, true);
        }
        validarAberta(solicitacao);
        var usuario = usuarioService.buscarAutenticado();
        var prioridade = request.prioridade() != null ? request.prioridade() : solicitacao.getPrioridade();
        var ticket = ordemServicoService.criar(new OrdemServicoRequest(
                request.titulo().trim(), request.descricao().trim(), solicitacao.getCliente().getId(),
                request.responsavelId(), request.projetoId(), prioridade, request.prazo(),
                request.prazoIndefinido(), null, Set.of()));
        anexoService.copiarParaTicket(solicitacao.getId(), ticket.id());

        var anterior = solicitacao.getStatus();
        solicitacao.setOrdemServico(ordemServicoService.buscarEntidade(ticket.id()));
        solicitacao.setStatus(StatusSolicitacao.CONVERTIDA_EM_TICKET);
        adicionarInteracao(solicitacao, usuario, OrigemSolicitacao.SISTEMA,
                "Solicitacao aprovada e transformada no Ticket #" + ticket.codigo() + ".");
        repository.save(solicitacao);
        auditoriaService.registrar(solicitacao, usuario, OrigemSolicitacao.EQUIPE, "CONVERSAO",
                "Solicitacao convertida no Ticket #" + ticket.codigo() + ".", anterior,
                solicitacao.getStatus());
        return detalhar(solicitacao, true);
    }

    @Transactional(readOnly = true)
    public Solicitacao buscarEntidade(UUID id) {
        return repository.buscarDetalhe(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitacao nao encontrada."));
    }

    @Transactional(readOnly = true)
    public Solicitacao validarAcessoPortal(String token, UUID id) {
        return buscarAutorizada(token, id);
    }

    private Solicitacao buscarParaAtualizacao(UUID id) {
        return repository.buscarParaAtualizacao(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitacao nao encontrada."));
    }

    private Solicitacao buscarAutorizada(String token, UUID id) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        return repository.findByIdAndClienteId(id, cliente.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Solicitacao nao encontrada para este cliente."));
    }

    private Solicitacao buscarAutorizadaParaAtualizacao(String token, UUID id) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        return repository.buscarParaAtualizacao(id)
                .filter(solicitacao -> solicitacao.getCliente().getId().equals(cliente.getId()))
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Solicitacao nao encontrada para este cliente."));
    }

    private SolicitacaoDetalheResponse detalhar(Solicitacao solicitacao, boolean incluirAuditoria) {
        var interacoes = interacaoRepository.findBySolicitacaoIdOrderByCriadoEmAsc(solicitacao.getId()).stream()
                .map(SolicitacaoInteracaoResponse::from)
                .toList();
        var auditoria = incluirAuditoria ? auditoriaService.listar(solicitacao.getId())
                : List.<AuditoriaSolicitacaoResponse>of();
        return new SolicitacaoDetalheResponse(
                SolicitacaoResumoResponse.from(solicitacao), solicitacao.getMotivoRejeicao(),
                solicitacao.getDetalheRejeicao(), interacoes, anexoService.listar(solicitacao.getId()), auditoria);
    }

    private InteracaoSolicitacao adicionarInteracao(Solicitacao solicitacao, Usuario usuario,
            OrigemSolicitacao origem, String mensagem) {
        var interacao = new InteracaoSolicitacao();
        interacao.setSolicitacao(solicitacao);
        interacao.setUsuario(usuario);
        interacao.setOrigem(origem);
        interacao.setMensagem(mensagem);
        solicitacao.setAtualizadoEm(OffsetDateTime.now());
        return interacaoRepository.save(interacao);
    }

    private void validarAberta(Solicitacao solicitacao) {
        if (STATUS_ENCERRADOS.contains(solicitacao.getStatus())) {
            throw new RegraNegocioException("Esta solicitacao ja foi encerrada.");
        }
    }

    private void validarTexto(String titulo, String descricao) {
        if (titulo == null || titulo.isBlank() || titulo.trim().length() > 180) {
            throw new RegraNegocioException("Informe um assunto com ate 180 caracteres.");
        }
        if (descricao == null || descricao.isBlank() || descricao.trim().length() > 10000) {
            throw new RegraNegocioException("Informe uma descricao com ate 10000 caracteres.");
        }
    }

    private String normalizarMensagem(String mensagem) {
        if (mensagem == null || mensagem.isBlank() || mensagem.trim().length() > 5000) {
            throw new RegraNegocioException("Informe uma mensagem com ate 5000 caracteres.");
        }
        return mensagem.trim();
    }
}
