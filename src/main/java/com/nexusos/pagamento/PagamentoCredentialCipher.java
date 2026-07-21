package com.nexusos.pagamento;

import com.nexusos.exception.RegraNegocioException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PagamentoCredentialCipher {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKeySpec key;

    public PagamentoCredentialCipher(@Value("${nexusos.mercado-pago.encryption-key:${nexusos.security.jwt.secret}}") String secret) {
        if (secret == null || secret.length() < 32) throw new IllegalStateException("A chave de criptografia de pagamentos deve ter ao menos 32 caracteres.");
        try { key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES"); }
        catch (GeneralSecurityException ex) { throw new IllegalStateException("Nao foi possivel preparar a criptografia de pagamentos.", ex); }
    }

    public String encrypt(String value) { return transform(value, Cipher.ENCRYPT_MODE); }
    public String decrypt(String value) { return transform(value, Cipher.DECRYPT_MODE); }

    private String transform(String value, int mode) {
        try {
            if (mode == Cipher.ENCRYPT_MODE) {
                byte[] iv = new byte[12]; RANDOM.nextBytes(iv);
                var cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(mode, key, new GCMParameterSpec(128, iv));
                var encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
                var payload = new byte[iv.length + encrypted.length];
                System.arraycopy(iv, 0, payload, 0, iv.length); System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
                return Base64.getEncoder().encodeToString(payload);
            }
            var payload = Base64.getDecoder().decode(value);
            if (payload.length < 29) throw new GeneralSecurityException("Conteudo cifrado invalido");
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(128, java.util.Arrays.copyOfRange(payload, 0, 12)));
            return new String(cipher.doFinal(java.util.Arrays.copyOfRange(payload, 12, payload.length)), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new RegraNegocioException("Nao foi possivel processar a credencial de pagamento configurada.");
        }
    }
}

