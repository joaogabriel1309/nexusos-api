package com.nexusos.portalcliente;

import com.nexusos.cliente.ClienteService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.OrdemServicoService;
import com.nexusos.pagamento.MercadoPagoService;
import com.nexusos.pagamento.dto.PagamentoCheckoutResponse;
import com.nexusos.pagamento.dto.PagamentoPixResponse;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.portalcliente.dto.PortalClienteResponse;
import com.nexusos.portalcliente.dto.PortalOrdemServicoResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PortalClienteService {

    private final ClienteService clienteService;
    private final OrdemServicoRepository ordemServicoRepository;
    private final OrdemServicoService ordemServicoService;
    private final MercadoPagoService mercadoPagoService;

    @Transactional(readOnly = true)
    public PortalClienteResponse listarOrdens(String token) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        var ordens = ordemServicoRepository.findByClienteIdOrderByAtualizadoEmDesc(cliente.getId()).stream()
                .map(PortalOrdemServicoResponse::from)
                .toList();
        return new PortalClienteResponse(cliente.getNome(), ordens);
    }

    @Transactional
    public PortalOrdemServicoResponse aprovar(String token, UUID ordemServicoId, String observacao) {
        return registrarDecisao(token, ordemServicoId, true, observacao);
    }

    @Transactional
    public PortalOrdemServicoResponse reprovar(String token, UUID ordemServicoId, String observacao) {
        if (observacao == null || observacao.isBlank()) {
            throw new RegraNegocioException("Informe o motivo da solicitacao de ajuste.");
        }
        return registrarDecisao(token, ordemServicoId, false, observacao.trim());
    }

    @Transactional
    public PagamentoCheckoutResponse iniciarPagamento(String token, UUID ordemServicoId) {
        var os = buscarOrdemAutorizadaPeloToken(token, ordemServicoId);

        return mercadoPagoService.criarCheckout(os, token);
    }

    @Transactional
    public PagamentoPixResponse gerarPix(String token, UUID ordemServicoId) {
        var os = buscarOrdemAutorizadaPeloToken(token, ordemServicoId);

        return mercadoPagoService.criarPix(os);
    }

    @Transactional
    public PortalOrdemServicoResponse confirmarPagamento(String token, UUID ordemServicoId, String paymentId) {
        var os = buscarOrdemAutorizadaPeloToken(token, ordemServicoId);

        var osAtualizada = mercadoPagoService.confirmarPagamentoCliente(os, paymentId);
        return PortalOrdemServicoResponse.from(osAtualizada);
    }

    @Transactional
    public PortalOrdemServicoResponse verificarPagamento(String token, UUID ordemServicoId) {
        var os = buscarOrdemAutorizadaPeloToken(token, ordemServicoId);

        var osAtualizada = mercadoPagoService.verificarPagamentoCliente(os);
        return PortalOrdemServicoResponse.from(osAtualizada);
    }

    private PortalOrdemServicoResponse registrarDecisao(String token, UUID ordemServicoId, boolean aprovado, String observacao) {
        var os = buscarOrdemAutorizadaPeloToken(token, ordemServicoId);

        ordemServicoService.registrarAprovacaoCliente(os.getId(), aprovado, observacao);
        return PortalOrdemServicoResponse.from(os);
    }

    @Transactional(readOnly = true)
    public OrdemServico validarAcesso(String token, UUID ordemServicoId) {
        return buscarOrdemAutorizadaPeloToken(token, ordemServicoId);
    }

    /**
     * Regra de permissao do portal publico:
     * o cliente so pode executar acoes ou acessar anexos de Tickets vinculados ao proprio token.
     *
     * Autoriza a acao publica somente quando o token pertence ao cliente do ticket.
     * A resposta indistinguivel de recurso inexistente evita revelar ticket de outro cliente.
     */
    private OrdemServico buscarOrdemAutorizadaPeloToken(String token, UUID ordemServicoId) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        return ordemServicoRepository.findById(ordemServicoId)
                .filter(ordem -> ordem.getCliente().getId().equals(cliente.getId()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ticket nao encontrada para este cliente."));
    }
}
