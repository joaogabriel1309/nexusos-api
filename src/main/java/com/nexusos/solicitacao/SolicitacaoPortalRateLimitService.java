package com.nexusos.solicitacao;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SolicitacaoPortalRateLimitService {
    private static final Duration JANELA = Duration.ofMinutes(10);
    private static final int MAXIMO_CRIACOES = 5;
    private static final int MAXIMO_RESPOSTAS = 30;
    private static final int MAXIMO_CHAVES = 10_000;
    private static final int MULTIPLICADOR_LIMITE_IP = 100;
    private final Map<String, Contador> contadores = new ConcurrentHashMap<>();
    private final AtomicLong operacoes = new AtomicLong();

    public void registrarCriacao(String token, String ip) {
        registrar("criacao", token, ip, MAXIMO_CRIACOES);
    }

    public void registrarResposta(String token, String ip) {
        registrar("resposta", token, ip, MAXIMO_RESPOSTAS);
    }

    private void registrar(String acao, String token, String ip, int limite) {
        var agora = Instant.now();
        if (operacoes.incrementAndGet() % 128 == 0) {
            removerExpirados(agora);
        }
        registrar(acao + "|token|" + resumir(token), limite, agora);
        registrar(acao + "|ip|" + resumir(ip), limite * MULTIPLICADOR_LIMITE_IP, agora);
    }

    private void registrar(String chave, int limite, Instant agora) {
        if (!contadores.containsKey(chave) && contadores.size() >= MAXIMO_CHAVES) {
            removerExpirados(agora);
            if (contadores.size() >= MAXIMO_CHAVES) {
                throw limiteExcedido();
            }
        }
        var contador = contadores.compute(chave, (ignorada, atual) -> {
            if (atual == null || atual.inicio().plus(JANELA).isBefore(agora)) {
                return new Contador(agora, 1);
            }
            return new Contador(atual.inicio(), atual.quantidade() + 1);
        });
        if (contador.quantidade() > limite) {
            throw limiteExcedido();
        }
    }

    private void removerExpirados(Instant agora) {
        contadores.entrySet().removeIf(entry -> entry.getValue().inicio().plus(JANELA).isBefore(agora));
    }

    private String resumir(String valor) {
        try {
            var hash = MessageDigest.getInstance("SHA-256")
                    .digest((valor == null ? "" : valor).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash, 0, 16);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponivel.", ex);
        }
    }

    private ResponseStatusException limiteExcedido() {
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Muitas solicitacoes em pouco tempo. Aguarde alguns minutos.");
    }

    private record Contador(Instant inicio, int quantidade) {
    }
}
