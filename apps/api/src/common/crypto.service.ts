import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const ALGO = 'aes-256-gcm';

/**
 * Central cryptography for the API:
 *  - AES-256-GCM encryption of Meta access tokens at rest (encrypt/decrypt)
 *  - scrypt password hashing (hashPassword/verifyPassword)
 *  - HMAC verification for Meta webhook signatures (verifyMetaSignature)
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (base64).');
    }
    this.key = key;
  }

  /** Returns iv:authTag:ciphertext, all base64, colon-separated. */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');
    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const hashBuf = Buffer.from(hash, 'hex');
    return hashBuf.length === derived.length && timingSafeEqual(hashBuf, derived);
  }

  /**
   * Verifies Meta's `X-Hub-Signature-256` header against the raw request body.
   * Meta signs with HMAC-SHA256 using the app secret.
   */
  verifyMetaSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
    if (!header || !appSecret) return false;
    const expected =
      'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
