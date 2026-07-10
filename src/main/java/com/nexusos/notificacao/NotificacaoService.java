package com.nexusos.notificacao;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.notificacao.dto.NotificacaoResponse;
import com.nexusos.notificacao.dto.NotificacaoResumoResponse;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.StatusOS;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioService;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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

    private final NotificacaoRepository notificacaoRepository;
    private final UsuarioService usuarioService;
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

        if (responsavel == null) {
            return;
        }

        criarSeNaoExistir(
                responsavel,
                ordemServico,
                TIPO_ATRIBUICAO,
                "OS atribuida a voce",
                mensagem,
                null
        );
    }

    @Transactional
    public void notificarStatus(OrdemServico ordemServico) {
        var responsavel = ordemServico.getResponsavel();

        if (responsavel == null) {
            return;
        }

        notificacaoRepository.save(Notificacao.builder()
                .usuario(responsavel)
                .ordemServico(ordemServico)
                .tipo(TIPO_STATUS)
                .titulo("Status da OS atualizado")
                .mensagem("A OS " + ordemServico.getCodigo() + " agora esta em " + ordemServico.getStatus() + ".")
                .build());
    }

    @Transactional
    public void notificarAprovacaoCliente(OrdemServico ordemServico, boolean aprovado) {
        var responsavel = ordemServico.getResponsavel();

        if (responsavel == null) {
            return;
        }

        notificacaoRepository.save(Notificacao.builder()
                .usuario(responsavel)
                .ordemServico(ordemServico)
                .tipo(TIPO_APROVACAO_CLIENTE)
                .titulo(aprovado ? "OS aprovada pelo cliente" : "OS reprovada pelo cliente")
                .mensagem(aprovado
                        ? "O cliente aprovou a OS " + ordemServico.getCodigo() + "."
                        : "O cliente reprovou a OS " + ordemServico.getCodigo() + " e ela voltou para analise.")
                .build());
    }

    @Transactional
    public void notificarPagamento(OrdemServico ordemServico, boolean paga) {
        var responsavel = ordemServico.getResponsavel();

        if (responsavel == null) {
            return;
        }

        notificacaoRepository.save(Notificacao.builder()
                .usuario(responsavel)
                .ordemServico(ordemServico)
                .tipo(TIPO_PAGAMENTO)
                .titulo(paga ? "Pagamento confirmado" : "Pagamento removido")
                .mensagem(paga
                        ? "A OS " + ordemServico.getCodigo() + " foi marcada como paga."
                        : "A OS " + ordemServico.getCodigo() + " voltou a constar como pendente.")
                .build());
    }

    @Scheduled(cron = "0 0 */6 * * *")
    @Transactional
    public void gerarNotificacoesDePrazo() {
        var hoje = LocalDate.now();
        var ordens = ordemServicoRepository.findByResponsavelIsNotNullAndStatusNot(StatusOS.FINALIZADA);

        for (var ordem : ordens) {
            if (ordem.getPrazo() == null || ordem.getResponsavel() == null) {
                continue;
            }

            var dias = ChronoUnit.DAYS.between(hoje, ordem.getPrazo());

            if (dias < 0) {
                criarSeNaoExistir(
                        ordem.getResponsavel(),
                        ordem,
                        TIPO_PRAZO_VENCIDO,
                        "Prazo da OS vencido",
                        "A OS " + ordem.getCodigo() + " venceu em " + ordem.getPrazo() + ".",
                        ordem.getPrazo()
                );
                continue;
            }

            if (dias <= 2) {
                var descricaoPrazo = dias == 0 ? "vence hoje" : dias == 1 ? "vence amanha" : "vence em 2 dias";
                criarSeNaoExistir(
                        ordem.getResponsavel(),
                        ordem,
                        TIPO_PRAZO_PROXIMO,
                        "Prazo da OS proximo",
                        "A OS " + ordem.getCodigo() + " " + descricaoPrazo + ".",
                        ordem.getPrazo()
                );
            }
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
