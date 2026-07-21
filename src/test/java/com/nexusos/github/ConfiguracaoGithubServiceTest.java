package com.nexusos.github;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.github.dto.ConfiguracaoGithubRequest;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.security.access.prepost.PreAuthorize;

class ConfiguracaoGithubServiceTest {
 private ConfiguracaoGithubRepository repository; private ConfiguracaoGithubService service;
 @BeforeEach void setup(){ repository=mock(ConfiguracaoGithubRepository.class); service=new ConfiguracaoGithubService(repository,new GithubTokenCipher("chave-de-teste-github-com-mais-de-trinta-e-dois-caracteres"),mock(GithubApiClient.class)); }
 @Test void salvaSemExporToken(){ var c=vazia(); when(repository.findById(ConfiguracaoGithub.ID)).thenReturn(Optional.of(c));when(repository.save(c)).thenReturn(c);var r=service.atualizar(new ConfiguracaoGithubRequest(true,"owner","repo","token-secreto","main"));assertThat(r.tokenConfigurado()).isTrue();assertThat(r.toString()).doesNotContain("token-secreto");assertThat(c.getTokenCriptografado()).doesNotContain("token-secreto"); }
 @Test void mantemTokenAnteriorQuandoAusente(){var c=vazia();c.setTokenCriptografado("token-cifrado-anterior");when(repository.findById(ConfiguracaoGithub.ID)).thenReturn(Optional.of(c));when(repository.save(c)).thenReturn(c);service.atualizar(new ConfiguracaoGithubRequest(false,"owner","repo","  ","main"));assertThat(c.getTokenCriptografado()).isEqualTo("token-cifrado-anterior");}
 @Test void bloqueiaSincronizacaoDesativada(){var c=vazia();when(repository.findById(ConfiguracaoGithub.ID)).thenReturn(Optional.of(c));assertThatThrownBy(service::validarParaSincronizar).isInstanceOf(RegraNegocioException.class).hasMessageContaining("desativada ou incompleta");}
 @Test void controllerSomenteAdmin(){assertThat(ConfiguracaoGithubController.class.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");}
 private ConfiguracaoGithub vazia(){return new ConfiguracaoGithub(ConfiguracaoGithub.ID,false,null,null,null,null,OffsetDateTime.now(),OffsetDateTime.now());}
}
