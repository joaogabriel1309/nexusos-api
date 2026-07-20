package com.nexusos.busca;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexusos.cliente.Cliente;
import com.nexusos.cliente.ClienteRepository;
import com.nexusos.ordemservico.OrdemServico;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.projeto.ProjetoRepository;
import com.nexusos.usuario.UsuarioRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class BuscaGlobalServiceTest {

    private OrdemServicoRepository ordemRepository;
    private ClienteRepository clienteRepository;
    private ProjetoRepository projetoRepository;
    private UsuarioRepository usuarioRepository;
    private BuscaGlobalService service;

    @BeforeEach
    void configurar() {
        ordemRepository = mock(OrdemServicoRepository.class);
        clienteRepository = mock(ClienteRepository.class);
        projetoRepository = mock(ProjetoRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        service = new BuscaGlobalService(ordemRepository, clienteRepository, projetoRepository, usuarioRepository);
    }

    @Test
    void desenvolvedorRecebeSomenteSuasOrdens() {
        var cliente = Cliente.builder().id(UUID.randomUUID()).nome("Acme").build();
        var ordem = OrdemServico.builder().id(UUID.randomUUID()).codigo(42L).titulo("Portal").cliente(cliente).build();
        when(ordemRepository.buscarGlobalmente(eq("42"), eq(42L), eq("dev@nexusos.com"), any(Pageable.class)))
                .thenReturn(List.of(ordem));
        var auth = new UsernamePasswordAuthenticationToken(
                "dev@nexusos.com", null, List.of(new SimpleGrantedAuthority("ROLE_DESENVOLVEDOR")));

        var resultado = service.buscar(" 42 ", auth);

        assertThat(resultado.ordensServico()).hasSize(1);
        assertThat(resultado.clientes()).isEmpty();
        verify(clienteRepository, never()).findByNomeContainingIgnoreCaseOrderByNomeAsc(any(), any());
        verify(projetoRepository, never()).findByNomeContainingIgnoreCaseOrderByNomeAsc(any(), any());
        verify(usuarioRepository, never()).findByEmailContainingIgnoreCaseOrderByEmailAsc(any(), any());
    }
}
