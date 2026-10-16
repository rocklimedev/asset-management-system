import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export class CredentialCrypto {
  private readonly key: Buffer;
  constructor(value: string) {
    if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 64 hexadecimal characters');
    this.key = Buffer.from(value, 'hex');
  }
  encrypt(value: string, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
  }
  decrypt(value: string, context: string): string {
    const [version, iv, tag, ciphertext, extra] = value.split('.');
    if (version !== 'v1' || !iv || !tag || ciphertext === undefined || extra !== undefined) throw new Error('Invalid encrypted credential');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }
}
