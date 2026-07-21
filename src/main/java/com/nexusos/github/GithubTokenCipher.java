package com.nexusos.github;
import com.nexusos.exception.RegraNegocioException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class GithubTokenCipher {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKeySpec key;
    public GithubTokenCipher(@Value("${nexusos.github.encryption-key:${nexusos.security.jwt.secret}}") String secret) {
        if (secret == null || secret.length() < 32) throw new IllegalStateException("A chave de criptografia do GitHub deve ter ao menos 32 caracteres.");
        try { key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES"); }
        catch (GeneralSecurityException ex) { throw new IllegalStateException("Nao foi possivel preparar a criptografia GitHub.", ex); }
    }
    public String encrypt(String value) { try { byte[] iv=new byte[12]; RANDOM.nextBytes(iv); var c=Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,iv)); byte[] e=c.doFinal(value.getBytes(StandardCharsets.UTF_8)); byte[] p=new byte[iv.length+e.length]; System.arraycopy(iv,0,p,0,iv.length); System.arraycopy(e,0,p,iv.length,e.length); return Base64.getEncoder().encodeToString(p); } catch(GeneralSecurityException ex){ throw new IllegalStateException("Nao foi possivel proteger o token GitHub.",ex); } }
    public String decrypt(String value) { try { byte[] p=Base64.getDecoder().decode(value); if(p.length<29) throw new GeneralSecurityException(); var c=Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,java.util.Arrays.copyOfRange(p,0,12))); return new String(c.doFinal(java.util.Arrays.copyOfRange(p,12,p.length)),StandardCharsets.UTF_8); } catch(GeneralSecurityException|IllegalArgumentException ex){ throw new RegraNegocioException("Nao foi possivel ler o token GitHub configurado."); } }
}
