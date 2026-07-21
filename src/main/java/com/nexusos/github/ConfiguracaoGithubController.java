package com.nexusos.github;
import com.nexusos.github.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/configuracoes/github") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class ConfiguracaoGithubController {
 private final ConfiguracaoGithubService service;
 @GetMapping public ResponseEntity<ConfiguracaoGithubResponse> buscar(){return ResponseEntity.ok(service.buscar());}
 @PutMapping public ResponseEntity<ConfiguracaoGithubResponse> atualizar(@Valid @RequestBody ConfiguracaoGithubRequest r){return ResponseEntity.ok(service.atualizar(r));}
 @PostMapping("/testar-conexao") public ResponseEntity<Void> testar(){service.testar();return ResponseEntity.noContent().build();}
}
