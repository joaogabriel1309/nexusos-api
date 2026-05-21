package com.nexusos.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LoginRateLimitService {

    private static final int MAX_TENTATIVAS = 5;
    private static final Duration JANELA = Duration.ofMinutes(10);
    private final Map<String, TentativasLogin> tentativas = new ConcurrentHashMap<>();

    public void verificar(String email, String ip) {
        var chave = chave(email, ip);
        var agora = Instant.now();
        var estado = tentativas.compute(chave, (key, atual) -> {
            if (atual == null || atual.inicio.plus(JANELA).isBefore(agora)) {
                return new TentativasLogin(agora, 0);
            }
            return atual;
        });

        if (estado.quantidade >= MAX_TENTATIVAS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas de login.");
        }
    }

    public void registrarFalha(String email, String ip) {
        var chave = chave(email, ip);
        var agora = Instant.now();
        tentativas.compute(chave, (key, atual) -> {
            if (atual == null || atual.inicio.plus(JANELA).isBefore(agora)) {
                return new TentativasLogin(agora, 1);
            }
            return new TentativasLogin(atual.inicio, atual.quantidade + 1);
        });
    }

    public void registrarSucesso(String email, String ip) {
        tentativas.remove(chave(email, ip));
    }

    private String chave(String email, String ip) {
        return email.toLowerCase(Locale.ROOT) + "|" + ip;
    }

    private record TentativasLogin(Instant inicio, int quantidade) {
    }
}
