import { UnprocessableEntityException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { prod } from '../common/env';

/** Uses the original Java SHA-256 key derivation and IV + ciphertext + GCM tag format. */
export class CredentialCipher {
  private key: Buffer;

  constructor(private readonly kind: string) {
    const secret = process.env[`${kind.toUpperCase()}_ENCRYPTION_KEY`] || process.env.JWT_SECRET || (!prod ? 'nexusos-local-dev-secret-32-bytes-minimum-use-only-dev' : '');
    if (secret.length < 32) throw new Error(`A chave de criptografia ${kind} deve ter ao menos 32 caracteres.`);
    this.key = createHash('sha256').update(secret, 'utf8').digest();
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('base64');
  }

  decrypt(value: string): string {
    try {
      if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 === 1) throw new Error('Base64 inválido');
      const data = Buffer.from(value, 'base64');
      if (data.length < 29) throw new Error('Conteúdo cifrado inválido');
      const decipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(-16));
      return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString('utf8');
    } catch {
      throw new UnprocessableEntityException(`Não foi possível ler a credencial ${this.kind} configurada.`);
    }
  }
}
