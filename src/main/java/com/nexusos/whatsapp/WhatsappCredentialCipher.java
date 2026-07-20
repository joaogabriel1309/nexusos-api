package com.nexusos.whatsapp;

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
public class WhatsappCredentialCipher {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKeySpec key;

    public WhatsappCredentialCipher(@Value("${nexusos.whatsapp.encryption-key:${nexusos.security.jwt.secret}}") String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("A chave de criptografia do WhatsApp deve ter ao menos 32 caracteres.");
        }
        try {
            key = new SecretKeySpec(MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Nao foi possivel preparar a criptografia do WhatsApp.", ex);
        }
    }

    public String encrypt(String value) {
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Nao foi possivel proteger a credencial do WhatsApp.", ex);
        }
    }

    public String decrypt(String value) {
        try {
            byte[] payload = Base64.getDecoder().decode(value);
            if (payload.length < 29) throw new GeneralSecurityException("Conteudo cifrado invalido");
            byte[] iv = java.util.Arrays.copyOfRange(payload, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(payload, 12, payload.length);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new RegraNegocioException("Nao foi possivel ler a credencial do WhatsApp configurada.");
        }
    }
}
