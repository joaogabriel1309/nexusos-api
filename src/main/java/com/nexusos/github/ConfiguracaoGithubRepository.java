package com.nexusos.github;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ConfiguracaoGithubRepository extends JpaRepository<ConfiguracaoGithub, UUID> {}
