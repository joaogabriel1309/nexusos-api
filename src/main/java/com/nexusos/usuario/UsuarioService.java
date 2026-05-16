package com.nexusos.usuario;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.usuario.dto.UsuarioRequest;
import com.nexusos.usuario.dto.UsuarioResponse;
import com.nexusos.usuario.dto.UsuarioUpdateRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll().stream().map(UsuarioResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorId(UUID id) {
        return UsuarioResponse.from(buscarEntidade(id));
    }

    @Transactional
    public UsuarioResponse criar(UsuarioRequest request) {
        validarEmailDisponivel(request.email(), null);
        var usuario = Usuario.builder()
                .nome(request.nome())
                .email(request.email().toLowerCase())
                .senha(passwordEncoder.encode(request.senha()))
                .perfil(request.perfil())
                .build();
        return UsuarioResponse.from(usuarioRepository.save(usuario));
    }

    @Transactional
    public UsuarioResponse atualizar(UUID id, UsuarioUpdateRequest request) {
        var usuario = buscarEntidade(id);
        validarEmailDisponivel(request.email(), id);
        usuario.setNome(request.nome());
        usuario.setEmail(request.email().toLowerCase());
        usuario.setPerfil(request.perfil());
        usuario.setAtivo(request.ativo());
        if (request.senha() != null && !request.senha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.senha()));
        }
        return UsuarioResponse.from(usuarioRepository.save(usuario));
    }

    @Transactional
    public void inativar(UUID id) {
        var usuario = buscarEntidade(id);
        usuario.setAtivo(false);
        usuarioRepository.save(usuario);
    }

    @Transactional(readOnly = true)
    public Usuario buscarEntidade(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario nao encontrado."));
    }

    private void validarEmailDisponivel(String email, UUID idAtual) {
        usuarioRepository.findByEmail(email.toLowerCase())
                .filter(usuario -> !usuario.getId().equals(idAtual))
                .ifPresent(usuario -> {
                    throw new RegraNegocioException("E-mail ja cadastrado.");
                });
    }
}
