package com.nexusos.ordemservico;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.github.*;
import com.nexusos.ordemservico.dto.*;
import com.nexusos.usuario.UsuarioService;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @RequiredArgsConstructor
public class GithubOrdemServicoService {
 private final OrdemServicoService osService; private final OrdemServicoRepository repository; private final ConfiguracaoGithubService configService; private final GithubApiClient client; private final ObjectMapper mapper; private final UsuarioService usuarioService;
 @Transactional public OrdemServicoResponse vincular(UUID id,GithubBranchRequest request){ var os=osService.buscarEntidade(id); validarResponsavel(os); os.setBranchGithub(request.branch().trim()); limpar(os); return OrdemServicoResponse.from(repository.save(os)); }
 public OrdemServicoResponse sincronizar(UUID id){ var os=osService.buscarEntidade(id); validarResponsavel(os); if(os.getBranchGithub()==null||os.getBranchGithub().isBlank()) throw new RegraNegocioException("Vincule uma branch GitHub o ticket antes de sincronizar."); var c=configService.validarParaSincronizar(); String token=configService.token(c); client.buscarBranch(c.getOwner(),c.getRepositorio(),os.getBranchGithub(),token); var commits=client.buscarCommits(c.getOwner(),c.getRepositorio(),os.getBranchGithub(),token); var pr=client.buscarPullRequest(c.getOwner(),c.getRepositorio(),os.getBranchGithub(),token); var arquivos=pr==null?java.util.List.<GithubApiClient.Arquivo>of():client.buscarArquivos(c.getOwner(),c.getRepositorio(),pr.numero(),token); return salvarSincronizacao(os.getId(),commits,pr,arquivos); }
 @Transactional protected OrdemServicoResponse salvarSincronizacao(UUID id,Object commits,GithubApiClient.PullRequest pr,Object arquivos){ var os=osService.buscarEntidade(id); try { os.setCommitsGithub(mapper.writeValueAsString(commits)); os.setArquivosAlteradosGithub(mapper.writeValueAsString(arquivos)); } catch(JsonProcessingException e){ throw new IllegalStateException("Nao foi possivel armazenar os dados do GitHub.",e); } os.setPullRequestNumero(pr==null?null:pr.numero()); os.setPullRequestUrl(pr==null?null:pr.url()); os.setPullRequestStatus(pr==null?null:pr.status().toUpperCase(Locale.ROOT)); os.setUltimaSincronizacaoGithub(OffsetDateTime.now()); return OrdemServicoResponse.from(repository.save(os)); }
 public String sugerir(UUID id){ var os=osService.buscarEntidade(id); String titulo=Normalizer.normalize(os.getTitulo(),Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+","-").replaceAll("(^-|-$)",""); return "os-"+os.getCodigo()+"-"+titulo; }
 private void validarResponsavel(OrdemServico os){ var a=SecurityContextHolder.getContext().getAuthentication(); boolean dev=a!=null&&a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_DESENVOLVEDOR")); if(dev&&(os.getResponsavel()==null||!os.getResponsavel().getEmail().equals(a.getName()))) throw new RegraNegocioException("Desenvolvedores so podem alterar o GitHub de ticket atribu?dos a eles."); }
 private void limpar(OrdemServico os){ os.setPullRequestNumero(null);os.setPullRequestUrl(null);os.setPullRequestStatus(null);os.setCommitsGithub(null);os.setArquivosAlteradosGithub(null);os.setUltimaSincronizacaoGithub(null); }
}
