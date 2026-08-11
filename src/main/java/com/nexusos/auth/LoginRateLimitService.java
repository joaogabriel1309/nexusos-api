package com.nexusos.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LoginRateLimitService {

    private static final int MAX_TENTATIVAS = 5;
    private static final Duration JANELA_LOGIN = Duration.ofMinutes(10);
    private static final int MAX_RECUPERACOES = 3;
    private static final Duration JANELA_RECUPERACAO = Duration.ofHours(1);
    private static final int MAX_CHAVES = 10_000;
    private final Map<String, Tentativas> tentativas = new ConcurrentHashMap<>();
    private final AtomicLong operacoes = new AtomicLong();

    public void verificar(String email, String ip) {
        var agora = Instant.now();
        fazerManutencao(agora);
        verificarLimite(chave("login-email", normalizarEmail(email)), JANELA_LOGIN, MAX_TENTATIVAS, agora,
                "Muitas tentativas de login.");
        verificarLimite(chave("login-origem", normalizarEmail(email) + "|" + normalizar(ip)),
                JANELA_LOGIN, MAX_TENTATIVAS, agora, "Muitas tentativas de login.");
    }

    public void registrarFalha(String email, String ip) {
        var agora = Instant.now();
        fazerManutencao(agora);
        incrementar(chave("login-email", normalizarEmail(email)), JANELA_LOGIN, agora);
        incrementar(chave("login-origem", normalizarEmail(email) + "|" + normalizar(ip)), JANELA_LOGIN, agora);
    }

    public void registrarSucesso(String email, String ip) {
        tentativas.remove(chave("login-email", normalizarEmail(email)));
        tentativas.remove(chave("login-origem", normalizarEmail(email) + "|" + normalizar(ip)));
    }

    public void registrarRecuperacao(String email, String ip) {
        var agora = Instant.now();
        fazerManutencao(agora);
        var chaveEmail = chave("recuperacao-email", normalizarEmail(email));
        var chaveOrigem = chave("recuperacao-origem", normalizarEmail(email) + "|" + normalizar(ip));
        var estado = incrementar(chaveEmail, JANELA_RECUPERACAO, agora);
        incrementar(chaveOrigem, JANELA_RECUPERACAO, agora);

        if (estado.quantidade() > MAX_RECUPERACOES) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas solicitacoes de recuperacao. Aguarde antes de tentar novamente.");
        }
    }

    private void verificarLimite(String chave, Duration janela, int limite, Instant agora, String mensagem) {
        garantirCapacidade(chave, agora);
        var estado = tentativas.compute(chave, (key, atual) ->
                expirado(atual, janela, agora) ? new Tentativas(agora, 0) : atual);
        if (estado.quantidade() >= limite) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, mensagem);
        }
    }

    private Tentativas incrementar(String chave, Duration janela, Instant agora) {
        garantirCapacidade(chave, agora);
        return tentativas.compute(chave, (key, atual) -> expirado(atual, janela, agora)
                ? new Tentativas(agora, 1)
                : new Tentativas(atual.inicio(), atual.quantidade() + 1));
    }

    private void fazerManutencao(Instant agora) {
        if (operacoes.incrementAndGet() % 128 == 0) {
            removerExpirados(agora);
        }
    }

    private void garantirCapacidade(String chave, Instant agora) {
        if (!tentativas.containsKey(chave) && tentativas.size() >= MAX_CHAVES) {
            removerExpirados(agora);
            if (tentativas.size() >= MAX_CHAVES) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Muitas tentativas em pouco tempo.");
            }
        }
    }

    private void removerExpirados(Instant agora) {
        tentativas.entrySet().removeIf(entry -> {
            var janela = entry.getKey().startsWith("recuperacao-") ? JANELA_RECUPERACAO : JANELA_LOGIN;
            return expirado(entry.getValue(), janela, agora);
        });
    }

    private boolean expirado(Tentativas atual, Duration janela, Instant agora) {
        return atual == null || atual.inicio().plus(janela).isBefore(agora);
    }

    private String chave(String acao, String valor) {
        try {
            var hash = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return acao + "|" + HexFormat.of().formatHex(hash, 0, 16);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponivel.", ex);
        }
    }

    private String normalizarEmail(String email) {
        return normalizar(email).toLowerCase(Locale.ROOT);
    }

    private String normalizar(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private record Tentativas(Instant inicio, int quantidade) {
    }
}
