package com.nexusos.configuracao;

import com.nexusos.exception.RegraNegocioException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class IACredentialCipher {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKeySpec key;
    public IACredentialCipher(@Value("${nexusos.ia.encryption-key:${nexusos.security.jwt.secret}}") String secret) {
        if (secret == null || secret.length() < 32) throw new IllegalStateException("A chave de criptografia da IA deve ter ao menos 32 caracteres.");
        try { key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES"); }
        catch (GeneralSecurityException e) { throw new IllegalStateException("Nao foi possivel preparar a criptografia da IA.", e); }
    }
    public String encrypt(String value) { try { byte[] iv = new byte[12]; RANDOM.nextBytes(iv); var c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv)); byte[] encrypted = c.doFinal(value.getBytes(StandardCharsets.UTF_8)); byte[] packed = new byte[iv.length + encrypted.length]; System.arraycopy(iv, 0, packed, 0, iv.length); System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length); return Base64.getEncoder().encodeToString(packed); } catch (GeneralSecurityException e) { throw new IllegalStateException("Nao foi possivel proteger a chave da IA.", e); } }
    public String decrypt(String value) { try { byte[] packed = Base64.getDecoder().decode(value); var c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOfRange(packed, 0, 12))); return new String(c.doFinal(Arrays.copyOfRange(packed, 12, packed.length)), StandardCharsets.UTF_8); } catch (GeneralSecurityException | IllegalArgumentException e) { throw new RegraNegocioException("Nao foi possivel ler a chave da IA configurada."); } }
}
