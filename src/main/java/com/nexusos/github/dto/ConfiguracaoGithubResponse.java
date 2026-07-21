package com.nexusos.github.dto;
import com.nexusos.github.ConfiguracaoGithub;
import java.time.OffsetDateTime;
public record ConfiguracaoGithubResponse(boolean habilitado, String owner, String repositorio,
        String branchPrincipal, boolean configurado, boolean tokenConfigurado, OffsetDateTime atualizadoEm) {
    public static ConfiguracaoGithubResponse from(ConfiguracaoGithub c) {
        return new ConfiguracaoGithubResponse(c.isHabilitado(), c.getOwner(), c.getRepositorio(), c.getBranchPrincipal(),
                c.configurado(), c.getTokenCriptografado()!=null && !c.getTokenCriptografado().isBlank(), c.getAtualizadoEm());
    }
}
