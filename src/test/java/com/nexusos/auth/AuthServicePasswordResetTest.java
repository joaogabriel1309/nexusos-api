package com.nexusos.auth;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.email.EmailService;
import com.nexusos.security.JwtService;
import com.nexusos.usuario.PerfilUsuario;
import com.nexusos.usuario.Usuario;
import com.nexusos.usuario.UsuarioRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {
    @Mock AuthenticationManager authenticationManager;
    @Mock UserDetailsService userDetailsService;
    @Mock JwtService jwtService;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock EmailService emailService;

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(authenticationManager, userDetailsService, jwtService, refreshTokenRepository,
                passwordResetTokenRepository, usuarioRepository, passwordEncoder, emailService);
    }

    @Test
    void solicitacaoNaoRevelaEmailInexistente() {
        when(usuarioRepository.findByEmail("ausente@nexusos.com")).thenReturn(Optional.empty());

        service.solicitarRecuperacaoSenha("AUSENTE@nexusos.com");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailService, never()).enviarRecuperacaoSenha(any(), any());
    }

    @Test
    void criaTokenHasheadoParaUsuarioAtivo() {
        var usuario = usuarioAtivo();
        when(usuarioRepository.findByEmail(usuario.getEmail())).thenReturn(Optional.of(usuario));
        var tokenSalvo = ArgumentCaptor.forClass(PasswordResetToken.class);
        var tokenEnviado = ArgumentCaptor.forClass(String.class);

        service.solicitarRecuperacaoSenha(usuario.getEmail());

        verify(passwordResetTokenRepository).save(tokenSalvo.capture());
        verify(emailService).enviarRecuperacaoSenha(eq(usuario.getEmail()), tokenEnviado.capture());
        assertNotEquals(tokenEnviado.getValue(), tokenSalvo.getValue().getTokenHash());
        verify(passwordResetTokenRepository).invalidarDoUsuario(eq(usuario), any());
    }

    @Test
    void redefineSenhaERevogaSessoes() {
        var usuario = usuarioAtivo();
        var token = PasswordResetToken.builder().usuario(usuario).tokenHash("hash")
                .expiraEm(OffsetDateTime.now().plusMinutes(30)).build();
        when(passwordResetTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NovaSenha1")).thenReturn("senha-codificada");

        service.redefinirSenha("token-valido", "NovaSenha1");

        verify(usuarioRepository).save(usuario);
        verify(refreshTokenRepository).revogarDoUsuario(eq(usuario), any());
        verify(passwordResetTokenRepository).invalidarDoUsuario(eq(usuario), any());
    }

    @Test
    void rejeitaTokenExpirado() {
        var token = PasswordResetToken.builder().usuario(usuarioAtivo()).tokenHash("hash")
                .expiraEm(OffsetDateTime.now().minusMinutes(1)).build();
        when(passwordResetTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

        assertThrows(ResponseStatusException.class,
                () -> service.redefinirSenha("token-expirado", "NovaSenha1"));
        verify(usuarioRepository, never()).save(any());
    }

    private Usuario usuarioAtivo() {
        return Usuario.builder().id(UUID.randomUUID()).nome("Usuario").email("usuario@nexusos.com")
                .senha("antiga").perfil(PerfilUsuario.ADMIN).ativo(true).build();
    }
}
