package com.nexusos.portalcliente;

import com.nexusos.cliente.ClienteService;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.ordemservico.OrdemServicoService;
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
        return registrarDecisao(token, ordemServicoId, false, observacao);
    }

    private PortalOrdemServicoResponse registrarDecisao(String token, UUID ordemServicoId, boolean aprovado, String observacao) {
        var cliente = clienteService.buscarPorTokenAcesso(token);
        var os = ordemServicoRepository.findById(ordemServicoId)
                .filter(ordem -> ordem.getCliente().getId().equals(cliente.getId()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("OS nao encontrada para este cliente."));

        var atualizada = ordemServicoService.registrarAprovacaoCliente(os.getId(), aprovado, observacao);
        return new PortalOrdemServicoResponse(
                atualizada.id(),
                atualizada.titulo(),
                atualizada.descricao(),
                atualizada.status(),
                atualizada.criadoEm(),
                atualizada.atualizadoEm(),
                atualizada.aprovadaPeloCliente(),
                atualizada.aprovadoPeloClienteEm(),
                atualizada.observacaoAprovacaoCliente()
        );
    }
}
