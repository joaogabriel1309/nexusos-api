package com.nexusos.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexusos.exception.RegraNegocioException;
import com.nexusos.integration.ExternalHttpRequestFactory;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
public class GithubApiClient {
    private final RestClient client;
    public GithubApiClient(RestClient.Builder builder, @Value("${nexusos.github.api-url:https://api.github.com}") String apiUrl) {
        client = builder.requestFactory(ExternalHttpRequestFactory.create())
                .baseUrl(apiUrl).defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28").build();
    }
    public void testar(String owner, String repo, String token) { get("/repos/{o}/{r}", token, owner, repo); }
    public void buscarBranch(String owner,String repo,String branch,String token) { get("/repos/{o}/{r}/branches/{b}",token,owner,repo,encode(branch)); }
    public List<Commit> buscarCommits(String owner,String repo,String branch,String token) {
        JsonNode n=get("/repos/{o}/{r}/commits?sha={b}&per_page=100",token,owner,repo,encode(branch));
        return stream(n).map(x -> new Commit(x.path("sha").asText(), x.path("commit").path("message").asText(), x.path("html_url").asText(), x.path("commit").path("author").path("date").asText())).toList();
    }
    public PullRequest buscarPullRequest(String owner,String repo,String branch,String token) {
        JsonNode n=get("/repos/{o}/{r}/pulls?state=all&head={head}&per_page=1",token,owner,repo,encode(owner+":"+branch));
        if (!n.isArray() || n.isEmpty()) return null;
        JsonNode p=n.get(0); return new PullRequest(p.path("number").asInt(),p.path("html_url").asText(),p.path("state").asText());
    }
    public List<Arquivo> buscarArquivos(String owner,String repo,int numero,String token) {
        JsonNode n=get("/repos/{o}/{r}/pulls/{n}/files?per_page=100",token,owner,repo,Integer.toString(numero));
        return stream(n).map(x -> new Arquivo(x.path("filename").asText(),x.path("status").asText(),x.path("additions").asInt(),x.path("deletions").asInt())).toList();
    }
    private java.util.stream.Stream<JsonNode> stream(JsonNode n){ var list=new java.util.ArrayList<JsonNode>(); n.forEach(list::add); return list.stream(); }
    private JsonNode get(String uri,String token,String... vars) {
        try { return client.get().uri(uri,(Object[])vars).header(HttpHeaders.AUTHORIZATION,"Bearer "+token).retrieve().body(JsonNode.class); }
        catch(HttpClientErrorException.NotFound ex){ throw new RegraNegocioException("Branch ou recurso nao encontrado no GitHub."); }
        catch(RestClientResponseException ex){ throw new RegraNegocioException("O GitHub recusou a solicitacao. Verifique repositorio, token e permissoes."); }
        catch(RestClientException ex){ throw new RegraNegocioException("Nao foi possivel conectar a API do GitHub."); }
    }
    private String encode(String s){ return URLEncoder.encode(s,StandardCharsets.UTF_8).replace("+","%20"); }
    public record Commit(String sha,String mensagem,String url,String data){}
    public record PullRequest(int numero,String url,String status){}
    public record Arquivo(String nome,String status,int adicoes,int remocoes){}
}
