package com.nexusos.usuario;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.notificacao.NotificacaoService;
import com.nexusos.usuario.dto.UsuarioRequest;
import com.nexusos.usuario.dto.UsuarioResponse;
import com.nexusos.usuario.dto.UsuarioUpdateRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<NotificacaoService> notificacaoServiceProvider;

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
        validarCriacaoPermitida();
        validarEmailDisponivel(request.email(), null);
        var usuario = Usuario.builder()
                .nome(request.nome())
                .email(request.email().toLowerCase())
                .senha(passwordEncoder.encode(request.senha()))
                .perfil(request.perfil())
                .build();
        var salvo = usuarioRepository.save(usuario);
        notificacaoServiceProvider.ifAvailable(notificacaoService -> notificacaoService.notificarUsuarioCriado(salvo));
        return UsuarioResponse.from(salvo);
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
        var salvo = usuarioRepository.save(usuario);
        notificacaoServiceProvider.ifAvailable(notificacaoService -> notificacaoService.notificarUsuarioInativado(salvo));
    }

    @Transactional(readOnly = true)
    public Usuario buscarEntidade(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario nao encontrado."));
    }

    @Transactional(readOnly = true)
    public Usuario buscarAutenticado() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Usuario autenticado nao encontrado.");
        }

        return usuarioRepository.findByEmail(authentication.getName().toLowerCase())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario autenticado nao encontrado."));
    }

    private void validarEmailDisponivel(String email, UUID idAtual) {
        usuarioRepository.findByEmail(email.toLowerCase())
                .filter(usuario -> !usuario.getId().equals(idAtual))
                .ifPresent(usuario -> {
                    throw new RegraNegocioException("E-mail ja cadastrado.");
                });
    }

    private void validarCriacaoPermitida() {
        if (usuarioRepository.count() == 0) {
            return;
        }

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var admin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));

        if (!admin) {
            throw new AccessDeniedException("Apenas administradores podem criar usuarios.");
        }
    }
}
