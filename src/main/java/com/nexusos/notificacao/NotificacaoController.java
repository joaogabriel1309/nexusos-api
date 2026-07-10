package com.nexusos.notificacao;

import com.nexusos.notificacao.dto.NotificacaoPaginaResponse;
import com.nexusos.notificacao.dto.NotificacaoResumoResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notificacoes")
@RequiredArgsConstructor
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    @Operation(summary = "Lista notificacoes do usuario autenticado")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<NotificacaoResumoResponse> listarMinhas() {
        return ResponseEntity.ok(notificacaoService.listarMinhas());
    }

    @Operation(summary = "Lista historico paginado de notificacoes do usuario autenticado")
    @GetMapping("/historico")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<NotificacaoPaginaResponse> listarHistorico(
            @RequestParam(defaultValue = "1") int pagina,
            @RequestParam(defaultValue = "20") int tamanho,
            @RequestParam(required = false) Boolean lida,
            @RequestParam(required = false) String tipo
    ) {
        return ResponseEntity.ok(notificacaoService.listarHistorico(pagina, tamanho, lida, tipo));
    }

    @Operation(summary = "Marca uma notificacao como lida")
    @PatchMapping("/{id}/lida")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<Void> marcarComoLida(@PathVariable UUID id) {
        notificacaoService.marcarComoLida(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Marca todas as notificacoes como lidas")
    @PatchMapping("/marcar-todas-lidas")
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public ResponseEntity<Void> marcarTodasComoLidas() {
        notificacaoService.marcarTodasComoLidas();
        return ResponseEntity.noContent().build();
    }
}
