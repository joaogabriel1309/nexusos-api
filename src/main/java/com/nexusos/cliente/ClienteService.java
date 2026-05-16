package com.nexusos.cliente;

import com.nexusos.cliente.dto.ClienteRequest;
import com.nexusos.cliente.dto.ClienteResponse;
import com.nexusos.cliente.dto.ClienteUpdateRequest;
import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar() {
        return clienteRepository.findAll().stream().map(ClienteResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(UUID id) {
        return ClienteResponse.from(buscarEntidade(id));
    }

    @Transactional
    public ClienteResponse criar(ClienteRequest request) {
        validarDocumentoDisponivel(request.documento(), null);
        var cliente = Cliente.builder()
                .nome(request.nome())
                .documento(request.documento())
                .email(request.email().toLowerCase())
                .telefone(request.telefone())
                .build();
        return ClienteResponse.from(clienteRepository.save(cliente));
    }

    @Transactional
    public ClienteResponse atualizar(UUID id, ClienteUpdateRequest request) {
        var cliente = buscarEntidade(id);
        validarDocumentoDisponivel(request.documento(), id);
        cliente.setNome(request.nome());
        cliente.setDocumento(request.documento());
        cliente.setEmail(request.email().toLowerCase());
        cliente.setTelefone(request.telefone());
        cliente.setAtivo(request.ativo());
        return ClienteResponse.from(clienteRepository.save(cliente));
    }

    @Transactional
    public void inativar(UUID id) {
        var cliente = buscarEntidade(id);
        cliente.setAtivo(false);
        clienteRepository.save(cliente);
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
}
