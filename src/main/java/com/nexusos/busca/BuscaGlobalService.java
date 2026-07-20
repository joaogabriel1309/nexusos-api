package com.nexusos.busca;

import com.nexusos.busca.dto.BuscaGlobalItemResponse;
import com.nexusos.busca.dto.BuscaGlobalResponse;
import com.nexusos.cliente.ClienteRepository;
import com.nexusos.ordemservico.OrdemServicoRepository;
import com.nexusos.projeto.ProjetoRepository;
import com.nexusos.usuario.UsuarioRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class BuscaGlobalService {

    private static final int LIMITE_POR_GRUPO = 5;

    private final OrdemServicoRepository ordemServicoRepository;
    private final ClienteRepository clienteRepository;
    private final ProjetoRepository projetoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public BuscaGlobalResponse buscar(String termoInformado, Authentication authentication) {
        var termo = termoInformado.trim();
        var pageable = PageRequest.of(0, LIMITE_POR_GRUPO);
        var administrador = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        var emailResponsavel = administrador ? null : authentication.getName();
        var codigo = parseCodigo(termo);

        var ordens = ordemServicoRepository.buscarGlobalmente(termo, codigo, emailResponsavel, pageable).stream()
                .map(os -> new BuscaGlobalItemResponse(
                        os.getId(),
                        "OS #" + os.getCodigo() + " - " + os.getTitulo(),
                        os.getCliente().getNome(),
                        "/ordens-servico/" + os.getId()))
                .toList();

        if (!administrador) {
            return new BuscaGlobalResponse(ordens, List.of(), List.of(), List.of());
        }

        var clientes = clienteRepository.findByNomeContainingIgnoreCaseOrderByNomeAsc(termo, pageable).stream()
                .map(cliente -> itemLista(cliente.getId(), cliente.getNome(), cliente.getEmail(), "/clientes", termo))
                .toList();
        var projetos = projetoRepository.findByNomeContainingIgnoreCaseOrderByNomeAsc(termo, pageable).stream()
                .map(projeto -> itemLista(
                        projeto.getId(),
                        projeto.getNome(),
                        projeto.getCliente() == null ? null : projeto.getCliente().getNome(),
                        "/projetos",
                        termo))
                .toList();
        var usuarios = usuarioRepository.findByEmailContainingIgnoreCaseOrderByEmailAsc(termo, pageable).stream()
                .map(usuario -> itemLista(usuario.getId(), usuario.getEmail(), usuario.getNome(), "/usuarios", termo))
                .toList();

        return new BuscaGlobalResponse(ordens, clientes, projetos, usuarios);
    }

    private BuscaGlobalItemResponse itemLista(
            java.util.UUID id, String titulo, String subtitulo, String caminho, String termo) {
        var href = UriComponentsBuilder.fromPath(caminho).queryParam("busca", termo).build().encode().toUriString();
        return new BuscaGlobalItemResponse(id, titulo, subtitulo, href);
    }

    private Long parseCodigo(String termo) {
        var codigo = termo.replaceFirst("(?i)^OS\\s*#?\\s*", "");
        try {
            return Long.valueOf(codigo);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
