package com.nexusos.pagamento;

import com.nexusos.exception.RecursoNaoEncontradoException;
import com.nexusos.pagamento.dto.ConfiguracaoPagamentoRequest;
import com.nexusos.pagamento.dto.ConfiguracaoPagamentoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ConfiguracaoPagamentoService {
    private final ConfiguracaoPagamentoRepository repository;
    private final PagamentoCredentialCipher cipher;
    @Value("${nexusos.mercado-pago.access-token:}") private String tokenAmbiente;

    @Transactional(readOnly = true)
    public ConfiguracaoPagamentoResponse buscar() { return ConfiguracaoPagamentoResponse.from(buscarEntidade(), preenchido(tokenAmbiente)); }

    @Transactional
    public ConfiguracaoPagamentoResponse atualizar(ConfiguracaoPagamentoRequest request) {
        var c = buscarEntidade();
        if (preenchido(request.mercadoPagoToken())) c.setMercadoPagoTokenCifrado(cipher.encrypt(request.mercadoPagoToken().trim()));
        c.setMercadoPagoChavePublica(normalizar(request.mercadoPagoChavePublica()));
        c.setExpiracaoLinkMinutos(request.expiracaoLinkMinutos());
        c.setCobrarAutomaticamenteOsFinalizada(request.cobrarAutomaticamenteOsFinalizada());
        c.setPermitirOsSemCobranca(request.permitirOsSemCobranca());
        return ConfiguracaoPagamentoResponse.from(repository.save(c), preenchido(tokenAmbiente));
    }

    @Transactional(readOnly = true)
    public ConfiguracaoPagamento buscarEntidade() { return repository.findById(ConfiguracaoPagamento.ID).orElseThrow(() -> new RecursoNaoEncontradoException("Configuracoes de pagamento nao encontradas.")); }

    @Transactional(readOnly = true)
    public String buscarAccessToken() {
        var cifrado = buscarEntidade().getMercadoPagoTokenCifrado();
        return preenchido(cifrado) ? cipher.decrypt(cifrado) : normalizar(tokenAmbiente);
    }
    private boolean preenchido(String v) { return v != null && !v.isBlank(); }
    private String normalizar(String v) { return preenchido(v) ? v.trim() : null; }
}

