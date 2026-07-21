package com.nexusos.github.dto;
import jakarta.validation.constraints.Size;
public record ConfiguracaoGithubRequest(boolean habilitado, @Size(max=255) String owner,
        @Size(max=255) String repositorio, @Size(max=500) String token, @Size(max=255) String branchPrincipal) {}
