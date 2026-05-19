package com.nexusos.projeto;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.projeto.dto.ProjetoRequest;
import com.nexusos.projeto.dto.ProjetoResponse;
import com.nexusos.projeto.dto.ProjetoUpdateRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjetoService {

    private final ProjetoRepository projetoRepository;

    @Transactional(readOnly = true)
    public List<ProjetoResponse> listar() {
        return projetoRepository.findAll().stream().map(ProjetoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ProjetoResponse buscarPorId(UUID id) {
        return ProjetoResponse.from(buscarEntidade(id));
    }

    @Transactional
    public ProjetoResponse criar(ProjetoRequest request) {
        var projeto = Projeto.builder()
                .nome(request.nome())
                .descricao(request.descricao())
                .build();
        return ProjetoResponse.from(projetoRepository.save(projeto));
    }

    @Transactional
    public ProjetoResponse atualizar(UUID id, ProjetoUpdateRequest request) {
        var projeto = buscarEntidade(id);
        projeto.setNome(request.nome());
        projeto.setDescricao(request.descricao());
        projeto.setAtivo(request.ativo());
        return ProjetoResponse.from(projetoRepository.save(projeto));
    }

    @Transactional
    public void inativar(UUID id) {
        var projeto = buscarEntidade(id);
        projeto.setAtivo(false);
        projetoRepository.save(projeto);
    }

    @Transactional(readOnly = true)
    public Projeto buscarEntidade(UUID id) {
        return projetoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Projeto nao encontrado."));
    }
}
