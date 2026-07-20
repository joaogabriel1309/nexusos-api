package com.nexusos.busca;

import com.nexusos.busca.dto.BuscaGlobalResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/busca-global")
@RequiredArgsConstructor
public class BuscaGlobalController {

    private final BuscaGlobalService buscaGlobalService;

    @Operation(summary = "Busca ordens de servico, clientes, projetos e usuarios")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DESENVOLVEDOR')")
    public BuscaGlobalResponse buscar(
            @RequestParam @Size(min = 2, max = 100) String termo,
            Authentication authentication) {
        return buscaGlobalService.buscar(termo, authentication);
    }
}
