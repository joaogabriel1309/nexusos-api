package com.nexusos.notificacao;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.notificacao.dto.NotificacaoPaginaResponse;
import com.nexusos.notificacao.dto.NotificacaoResponse;
import com.nexusos.notificacao.dto.NotificacaoResumoResponse;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioRepository;
import com.nexusos.usuario.UsuarioService;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private static final String TIPO_ATRIBUICAO = "ATRIBUICAO";
    private static final String TIPO_STATUS = "STATUS";
    private static final String TIPO_PRAZO_PROXIMO = "PRAZO_PROXIMO";
    private static final String TIPO_PRAZO_VENCIDO = "PRAZO_VENCIDO";
    private static final String TIPO_APROVACAO_CLIENTE = "APROVACAO_CLIENTE";
    private static final String TIPO_PAGAMENTO = "PAGAMENTO";
    private static final String TIPO_OS_SEM_RESPONSAVEL = "OS_SEM_RESPONSAVEL";
    private static final String TIPO_OS_SEM_PRAZO = "OS_SEM_PRAZO";
    private static final String TIPO_OS_CRITICA = "OS_CRITICA";
    private static final String TIPO_OS_CRITICA_VENCIDA = "OS_CRITICA_VENCIDA";
    private static final String TIPO_OS_PARADA = "OS_PARADA";
    private static final String TIPO_RESPONSAVEL_ALTERADO = "RESPONSAVEL_ALTERADO";
    private static final String TIPO_COMENTARIO = "COMENTARIO";
    private static final String TIPO_CHECKLIST = "CHECKLIST";
    private static final String TIPO_ANEXO = "ANEXO";
    private static final String TIPO_PRIORIDADE = "PRIORIDADE";
    private static final String TIPO_PRAZO_ALTERADO = "PRAZO_ALTERADO";
    private static final String TIPO_APONTAMENTO = "APONTAMENTO";
    private static final String TIPO_INTEGRACAO_FALHA = "INTEGRACAO_FALHA";
    private static final String TIPO_USUARIO = "USUARIO";
    private static final String TIPO_CLIENTE = "CLIENTE";
    private static final String TIPO_PROJETO = "PROJETO";

    private final NotificacaoRepository notificacaoRepository;
    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final OrdemServicoRepository ordemServicoRepository;

    @Transactional(readOnly = true)
    public NotificacaoResumoResponse listarMinhas() {
        var usuario = usuarioService.buscarAutenticado();
        var itens = notificacaoRepository.findTop20ByUsuarioIdOrderByCriadoEmDesc(usuario.getId())
                .stream()
                .map(NotificacaoResponse::from)
                .toList();

        return new NotificacaoResumoResponse(
                notificacaoRepository.countByUsuarioIdAndLidaFalse(usuario.getId()),
                itens
        );
    }

    @Transactional(readOnly = true)
    public NotificacaoPaginaResponse listarHistorico(int pagina, int tamanho, Boolean lida, String tipo) {
        var usuario = usuarioService.buscarAutenticado();
        var paginaAjustada = Math.max(pagina, 1);
        var tamanhoAjustado = Math.max(tamanho, 1);
        var pageable = PageRequest.of(paginaAjustada - 1, tamanhoAjustado, Sort.by(Sort.Direction.DESC, "criadoEm"));
        var tipoNormalizado = tipo != null && !tipo.isBlank() ? tipo.trim() : null;

        Page<Notificacao> resultado;
        if (tipoNormalizado != null && lida != null) {
            resultado = notificacaoRepository.findByUsuarioIdAndTipoAndLida(usuario.getId(), tipoNormalizado, lida, pageable);
        } else if (tipoNormalizado != null) {
            resultado = notificacaoRepository.findByUsuarioIdAndTipo(usuario.getId(), tipoNormalizado, pageable);
        } else if (lida != null) {
            resultado = notificacaoRepository.findByUsuarioIdAndLida(usuario.getId(), lida, pageable);
        } else {
            resultado = notificacaoRepository.findByUsuarioId(usuario.getId(), pageable);
        }

        return new NotificacaoPaginaResponse(
                notificacaoRepository.countByUsuarioIdAndLidaFalse(usuario.getId()),
                resultado.getTotalElements(),
                paginaAjustada,
                tamanhoAjustado,
                Math.max(resultado.getTotalPages(), 1),
                notificacaoRepository.findTiposDisponiveisByUsuarioId(usuario.getId()),
                resultado.getContent().stream().map(NotificacaoResponse::from).toList()
        );
    }

    @Transactional
    public void marcarComoLida(UUID id) {
        var usuario = usuarioService.buscarAutenticado();
        var notificacao = notificacaoRepository.findByIdAndUsuarioId(id, usuario.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Notificacao nao encontrada."));

        if (!notificacao.isLida()) {
            notificacao.setLida(true);
            notificacao.setLidaEm(OffsetDateTime.now());
            notificacaoRepository.save(notificacao);
        }
    }

    @Transactional
    public void marcarTodasComoLidas() {
        var usuario = usuarioService.buscarAutenticado();
        var notificacoes = notificacaoRepository.findByUsuarioIdAndLidaFalse(usuario.getId());

        for (var notificacao : notificacoes) {
            notificacao.setLida(true);
            notificacao.setLidaEm(OffsetDateTime.now());
        }

        notificacaoRepository.saveAll(notificacoes);
    }

    @Transactional
    public void notificarAtribuicao(OrdemServico ordemServico, String mensagem) {
        var responsavel = ordemServico.getResponsavel();

        notificarAdmins(
                ordemServico,
                TIPO_ATRIBUICAO,
                "OS atribuida",
                "A OS " + ordemServico.getCodigo() + " foi atribuida para "
                        + (responsavel != null ? responsavel.getNome() : "um responsavel") + "."
        );

        if (isDesenvolvedor(responsavel)) {
            criarSeNaoExistir(
                    responsavel,
                    ordemServico,
                    TIPO_ATRIBUICAO,
                    "OS atribuida a voce",
                    mensagem,
                    null
            );
        }
    }

    @Transactional
    public void notificarOsCriada(OrdemServico ordemServico) {
        if (ordemServico.getResponsavel() == null) {
            notificarAdmins(
                    ordemServico,
                    TIPO_OS_SEM_RESPONSAVEL,
                    "OS criada sem responsavel",
                    "A OS " + ordemServico.getCodigo() + " foi criada sem responsavel."
            );
        }

        if (ordemServico.getPrazo() == null) {
            notificarAdmins(
                    ordemServico,
                    TIPO_OS_SEM_PRAZO,
                    "OS criada sem prazo",
                    "A OS " + ordemServico.getCodigo() + " foi criada sem prazo definido."
            );
        }

        notificarSeCritica(ordemServico, "OS critica criada");
    }

    @Transactional
    public void notificarStatus(OrdemServico ordemServico) {
        notificarAdmins(
                ordemServico,
                TIPO_STATUS,
                "Status da OS atualizado",
                "A OS " + ordemServico.getCodigo() + " agora esta em " + ordemServico.getStatus() + "."
        );
    }

    @Transactional
    public void notificarAprovacaoCliente(OrdemServico ordemServico, boolean aprovado) {
        var responsavel = ordemServico.getResponsavel();
        var titulo = aprovado ? "OS aprovada pelo cliente" : "OS reprovada pelo cliente";
        var mensagem = aprovado
                ? "O cliente aprovou a OS " + ordemServico.getCodigo() + "."
                : "O cliente reprovou a OS " + ordemServico.getCodigo() + " e ela voltou para analise.";

        notificarAdmins(ordemServico, TIPO_APROVACAO_CLIENTE, titulo, mensagem);

        if (isDesenvolvedor(responsavel)) {
            notificacaoRepository.save(Notificacao.builder()
                    .usuario(responsavel)
                    .ordemServico(ordemServico)
                    .tipo(TIPO_APROVACAO_CLIENTE)
                    .titulo(titulo)
                    .mensagem(mensagem)
                    .build());
        }
    }

    @Transactional
    public void notificarPagamento(OrdemServico ordemServico, boolean paga) {
        notificarAdmins(
                ordemServico,
                TIPO_PAGAMENTO,
                paga ? "Pagamento confirmado" : "Pagamento removido",
                paga
                        ? "A OS " + ordemServico.getCodigo() + " foi marcada como paga."
                        : "A OS " + ordemServico.getCodigo() + " voltou a constar como pendente."
        );
    }

    @Transactional
    public void notificarComentario(OrdemServico ordemServico, Usuario autor) {
        var titulo = "Novo comentario na OS";
        var mensagem = "A OS " + ordemServico.getCodigo() + " recebeu um novo comentario"
                + (autor != null ? " de " + autor.getNome() : "") + ".";

        notificarAdmins(ordemServico, TIPO_COMENTARIO, titulo, mensagem);
        notificarResponsavelSobreInteracao(ordemServico, autor, TIPO_COMENTARIO, titulo, mensagem);
    }

    @Transactional
    public void notificarChecklist(OrdemServico ordemServico, String descricaoEvento) {
        var titulo = "Checklist atualizado";
        var mensagem = "O checklist da OS " + ordemServico.getCodigo() + " foi atualizado: " + descricaoEvento + ".";

        notificarAdmins(ordemServico, TIPO_CHECKLIST, titulo, mensagem);
        notificarResponsavelSobreInteracao(ordemServico, null, TIPO_CHECKLIST, titulo, mensagem);
    }

    @Transactional
    public void notificarAnexo(OrdemServico ordemServico, String nomeArquivo) {
        var titulo = "Novo anexo na OS";
        var mensagem = "A OS " + ordemServico.getCodigo() + " recebeu o anexo " + nomeArquivo + ".";

        notificarAdmins(ordemServico, TIPO_ANEXO, titulo, mensagem);
    }

    @Transactional
    public void notificarPrioridadeAlterada(OrdemServico ordemServico) {
        var titulo = "Prioridade da OS alterada";
        var mensagem = "A OS " + ordemServico.getCodigo() + " agora esta com prioridade " + ordemServico.getPrioridade() + ".";

        notificarAdmins(ordemServico, TIPO_PRIORIDADE, titulo, mensagem);
        notificarSeCritica(ordemServico, "OS critica");
    }

    @Transactional
    public void notificarPrazoAlterado(OrdemServico ordemServico) {
        var titulo = "Prazo da OS alterado";
        var mensagem = ordemServico.getPrazo() != null
                ? "A OS " + ordemServico.getCodigo() + " agora tem prazo em " + ordemServico.getPrazo() + "."
                : "A OS " + ordemServico.getCodigo() + " ficou sem prazo definido.";

        notificarAdmins(ordemServico, TIPO_PRAZO_ALTERADO, titulo, mensagem);

        if (ordemServico.getPrazo() == null) {
            notificarAdmins(ordemServico, TIPO_OS_SEM_PRAZO, "OS sem prazo", mensagem);
        }
    }

    @Transactional
    public void notificarResponsavelAlterado(OrdemServico ordemServico, Usuario responsavelAnterior) {
        var responsavelAtual = ordemServico.getResponsavel();
        var anterior = responsavelAnterior != null ? responsavelAnterior.getNome() : "sem responsavel";
        var atual = responsavelAtual != null ? responsavelAtual.getNome() : "sem responsavel";

        notificarAdmins(
                ordemServico,
                TIPO_RESPONSAVEL_ALTERADO,
                "Responsavel da OS alterado",
                "A OS " + ordemServico.getCodigo() + " mudou de " + anterior + " para " + atual + "."
        );
    }

    @Transactional
    public void notificarApontamento(OrdemServico ordemServico, Usuario usuario, String descricaoEvento) {
        notificarAdmins(
                ordemServico,
                TIPO_APONTAMENTO,
                "Apontamento de tempo atualizado",
                "A OS " + ordemServico.getCodigo() + " teve apontamento de tempo atualizado"
                        + (usuario != null ? " por " + usuario.getNome() : "") + ": " + descricaoEvento + "."
        );
        notificarResponsavelSobreInteracao(
                ordemServico,
                usuario,
                TIPO_APONTAMENTO,
                "Apontamento de tempo atualizado",
                "A OS " + ordemServico.getCodigo() + " teve apontamento de tempo atualizado"
                        + (usuario != null ? " por " + usuario.getNome() : "") + ": " + descricaoEvento + "."
        );
    }

    @Transactional
    public void notificarFalhaIntegracao(OrdemServico ordemServico, String canal, String detalhe) {
        notificarAdmins(
                ordemServico,
                TIPO_INTEGRACAO_FALHA,
                "Falha em " + canal,
                "Falha em " + canal + " na OS " + ordemServico.getCodigo() + ": " + detalhe
        );
    }

    @Transactional
    public void notificarUsuarioCriado(Usuario usuario) {
        notificarAdminsSistema(
                TIPO_USUARIO,
                "Usuario novo cadastrado",
                "O usuario " + usuario.getNome() + " (" + usuario.getEmail() + ") foi cadastrado como " + usuario.getPerfil() + "."
        );
    }

    @Transactional
    public void notificarUsuarioInativado(Usuario usuario) {
        notificarAdminsSistema(
                TIPO_USUARIO,
                "Usuario inativado",
                "O usuario " + usuario.getNome() + " (" + usuario.getEmail() + ") foi inativado."
        );
    }

    @Transactional
    public void notificarClienteInativado(String nomeCliente) {
        notificarAdminsSistema(
                TIPO_CLIENTE,
                "Cliente desativado",
                "O cliente " + nomeCliente + " foi desativado."
        );
    }

    @Transactional
    public void notificarProjetoSemOs(String nomeProjeto) {
        notificarAdminsSistema(
                TIPO_PROJETO,
                "Projeto criado sem OS",
                "O projeto " + nomeProjeto + " foi criado e ainda nao possui OS vinculada."
        );
    }

    @Scheduled(cron = "0 0 */6 * * *")
    @Transactional
    public void gerarNotificacoesDePrazo() {
        var hoje = LocalDate.now();
        var ordens = ordemServicoRepository.findByResponsavelIsNotNullAndStatusNot(StatusOS.FINALIZADA);

        for (var ordem : ordens) {
            if (ordem.getPrazo() == null) {
                continue;
            }

            var dias = ChronoUnit.DAYS.between(hoje, ordem.getPrazo());

            if (dias < 0) {
                var titulo = "Prazo da OS vencido";
                var mensagem = "A OS " + ordem.getCodigo() + " venceu em " + ordem.getPrazo() + ".";
                criarSeNaoExistir(
                        adminsAtivos(),
                        ordem,
                        TIPO_PRAZO_VENCIDO,
                        titulo,
                        mensagem,
                        ordem.getPrazo()
                );
                notificarDesenvolvedorResponsavelSobrePrazo(ordem, TIPO_PRAZO_VENCIDO, titulo, mensagem);
                notificarAdminsSobreOsCriticaVencida(ordem);
                notificarAdminsSobreOsParada(ordem, hoje);
                continue;
            }

            if (dias <= 2) {
                var descricaoPrazo = dias == 0 ? "vence hoje" : dias == 1 ? "vence amanha" : "vence em 2 dias";
                var titulo = "Prazo da OS proximo";
                var mensagem = "A OS " + ordem.getCodigo() + " " + descricaoPrazo + ".";
                criarSeNaoExistir(
                        adminsAtivos(),
                        ordem,
                        TIPO_PRAZO_PROXIMO,
                        titulo,
                        mensagem,
                        ordem.getPrazo()
                );
                notificarDesenvolvedorResponsavelSobrePrazo(ordem, TIPO_PRAZO_PROXIMO, titulo, mensagem);
            }

            notificarAdminsSobreOsParada(ordem, hoje);
        }
    }

    private void notificarAdmins(OrdemServico ordemServico, String tipo, String titulo, String mensagem) {
        for (var admin : adminsAtivos()) {
            notificacaoRepository.save(Notificacao.builder()
                    .usuario(admin)
                    .ordemServico(ordemServico)
                    .tipo(tipo)
                    .titulo(titulo)
                    .mensagem(mensagem)
                    .build());
        }
    }

    private void notificarAdminsSistema(String tipo, String titulo, String mensagem) {
        for (var admin : adminsAtivos()) {
            notificacaoRepository.save(Notificacao.builder()
                    .usuario(admin)
                    .tipo(tipo)
                    .titulo(titulo)
                    .mensagem(mensagem)
                    .build());
        }
    }

    private List<Usuario> adminsAtivos() {
        return usuarioRepository.findByPerfilAndAtivoTrue(PerfilUsuario.ADMIN);
    }

    private boolean isDesenvolvedor(Usuario usuario) {
        return usuario != null && usuario.getPerfil() == PerfilUsuario.DESENVOLVEDOR;
    }

    private void notificarSeCritica(OrdemServico ordemServico, String titulo) {
        if (ordemServico.getPrioridade() == null || !"CRITICA".equals(ordemServico.getPrioridade().name())) {
            return;
        }

        notificarAdmins(
                ordemServico,
                TIPO_OS_CRITICA,
                titulo,
                "A OS " + ordemServico.getCodigo() + " esta com prioridade critica."
        );
    }

    private void notificarAdminsSobreOsCriticaVencida(OrdemServico ordemServico) {
        if (ordemServico.getPrioridade() == null || !"CRITICA".equals(ordemServico.getPrioridade().name())) {
            return;
        }

        criarSeNaoExistir(
                adminsAtivos(),
                ordemServico,
                TIPO_OS_CRITICA_VENCIDA,
                "OS critica vencida",
                "A OS critica " + ordemServico.getCodigo() + " venceu em " + ordemServico.getPrazo() + ".",
                ordemServico.getPrazo()
        );
    }

    private void notificarResponsavelSobreInteracao(
            OrdemServico ordemServico,
            Usuario autor,
            String tipo,
            String titulo,
            String mensagem
    ) {
        var responsavel = ordemServico.getResponsavel();
        if (responsavel == null) {
            return;
        }

        if (autor != null && autor.getId() != null && autor.getId().equals(responsavel.getId())) {
            return;
        }

        notificacaoRepository.save(Notificacao.builder()
                .usuario(responsavel)
                .ordemServico(ordemServico)
                .tipo(tipo)
                .titulo(titulo)
                .mensagem(mensagem)
                .build());
    }

    private void notificarAdminsSobreOsParada(OrdemServico ordemServico, LocalDate hoje) {
        if (ordemServico.getAtualizadoEm() == null) {
            return;
        }

        var diasSemAtualizacao = ChronoUnit.DAYS.between(ordemServico.getAtualizadoEm().toLocalDate(), hoje);
        if (diasSemAtualizacao < 3) {
            return;
        }

        criarSeNaoExistir(
                adminsAtivos(),
                ordemServico,
                TIPO_OS_PARADA,
                "OS parada ha " + diasSemAtualizacao + " dias",
                "A OS " + ordemServico.getCodigo() + " esta sem atualizacao ha " + diasSemAtualizacao + " dias.",
                hoje
        );
    }

    private void notificarDesenvolvedorResponsavelSobrePrazo(
            OrdemServico ordemServico,
            String tipo,
            String titulo,
            String mensagem
    ) {
        var responsavel = ordemServico.getResponsavel();

        if (!isDesenvolvedor(responsavel)) {
            return;
        }

        criarSeNaoExistir(
                responsavel,
                ordemServico,
                tipo,
                titulo,
                mensagem,
                ordemServico.getPrazo()
        );
    }

    private void criarSeNaoExistir(
            List<Usuario> usuarios,
            OrdemServico ordemServico,
            String tipo,
            String titulo,
            String mensagem,
            LocalDate referenciaData
    ) {
        for (var usuario : usuarios) {
            criarSeNaoExistir(usuario, ordemServico, tipo, titulo, mensagem, referenciaData);
        }
    }

    private void criarSeNaoExistir(
            Usuario usuario,
            OrdemServico ordemServico,
            String tipo,
            String titulo,
            String mensagem,
            LocalDate referenciaData
    ) {
        boolean existe = referenciaData != null
                ? notificacaoRepository.existsByUsuarioIdAndOrdemServicoIdAndTipoAndReferenciaData(
                        usuario.getId(),
                        ordemServico.getId(),
                        tipo,
                        referenciaData
                )
                : notificacaoRepository.existsByUsuarioIdAndOrdemServicoIdAndTipoAndReferenciaDataIsNull(
                        usuario.getId(),
                        ordemServico.getId(),
                        tipo
                );

        if (existe) {
            return;
        }

        notificacaoRepository.save(Notificacao.builder()
                .usuario(usuario)
                .ordemServico(ordemServico)
                .tipo(tipo)
                .titulo(titulo)
                .mensagem(mensagem)
                .referenciaData(referenciaData)
                .build());
    }
}
