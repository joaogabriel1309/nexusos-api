package com.nexusos.cliente;

import com.nexusos.cliente.dto.ClienteRequest;
import com.nexusos.cliente.dto.ClienteResponse;
import com.nexusos.cliente.dto.ClienteUpdateRequest;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar() {
        return clienteRepository.findAll().stream().map(ClienteResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(UUID id) {
        return ClienteResponse.from(buscarEntidade(id));
    }

    @Transactional
    public ClienteResponse gerarNovoTokenAcesso(UUID id) {
        var cliente = buscarEntidade(id);
        cliente.setTokenAcesso(UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""));
        return ClienteResponse.from(clienteRepository.save(cliente));
    }

    @Transactional(readOnly = true)
    public Cliente buscarPorTokenAcesso(String tokenAcesso) {
        return clienteRepository.findByTokenAcesso(tokenAcesso)
                .filter(Cliente::isAtivo)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Link de acesso invalido."));
    }

    @Transactional
    public ClienteResponse criar(ClienteRequest request) {
        validarDocumentoDisponivel(request.documento(), null);
        var cliente = Cliente.builder()
                .nome(request.nome())
                .documento(request.documento())
                .email(request.email().toLowerCase())
                .telefone(request.telefone())
                .valorHora(request.valorHora())
                .enviarEmail(Boolean.TRUE.equals(request.enviarEmail()))
                .enviarWhatsapp(Boolean.TRUE.equals(request.enviarWhatsapp()))
                .whatsappApiKey(normalizarTexto(request.whatsappApiKey()))
                .build();
        return ClienteResponse.from(clienteRepository.save(cliente));
    }

    @Transactional
    public ClienteResponse atualizar(UUID id, ClienteUpdateRequest request) {
        var cliente = buscarEntidade(id);
        var estavaAtivo = cliente.isAtivo();
        validarDocumentoDisponivel(request.documento(), id);
        cliente.setNome(request.nome());
        cliente.setDocumento(request.documento());
        cliente.setEmail(request.email().toLowerCase());
        cliente.setTelefone(request.telefone());
        cliente.setValorHora(request.valorHora());
        cliente.setEnviarEmail(Boolean.TRUE.equals(request.enviarEmail()));
        cliente.setEnviarWhatsapp(Boolean.TRUE.equals(request.enviarWhatsapp()));
        cliente.setWhatsappApiKey(normalizarTexto(request.whatsappApiKey()));
        cliente.setAtivo(request.ativo());
        var salvo = clienteRepository.save(cliente);
        if (estavaAtivo && !salvo.isAtivo()) {
            notificacaoService.notificarClienteInativado(salvo.getNome());
        }
        return ClienteResponse.from(salvo);
    }

    @Transactional
    public void inativar(UUID id) {
        var cliente = buscarEntidade(id);
        cliente.setAtivo(false);
        var salvo = clienteRepository.save(cliente);
        notificacaoService.notificarClienteInativado(salvo.getNome());
    }

    @Transactional(readOnly = true)
    public Cliente buscarEntidade(UUID id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente nao encontrado."));
    }

    private void validarDocumentoDisponivel(String documento, UUID idAtual) {
        clienteRepository.findByDocumento(documento)
                .filter(cliente -> !cliente.getId().equals(idAtual))
                .ifPresent(cliente -> {
                    throw new RegraNegocioException("Documento ja cadastrado.");
                });
    }

    private String normalizarTexto(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
