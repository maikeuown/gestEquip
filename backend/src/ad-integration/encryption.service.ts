import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Simple symmetric encryption for bind passwords stored in DB.
 * Uses a server-side key from environment. Not a substitute for
 * a proper vault but prevents plaintext passwords in the database.
 */
export class EncryptionService {
  private key: Buffer;

  constructor() {
    const raw = process.env.AD_ENCRYPTION_KEY;
    if (!raw || raw.length < 32) {
      // Derive a fallback 32-byte key from a fixed string
      const fallback = 'gestequip-ad-encryption-key-32bytes!!';
      this.key = Buffer.from(fallback.slice(0, 32), 'utf-8');
    } else {
      this.key = Buffer.from(raw.slice(0, 32), 'utf-8');
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    // Format: salt:iv:tag:ciphertext (all base64, colon-separated)
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted,
    ].join(':');
  }

  decrypt(encryptedData: string): string {
    const [saltB64, ivB64, tagB64, ciphertext] = encryptedData.split(':');
    if (!saltB64 || !ivB64 || !tagB64 || !ciphertext) {
      throw new Error('Invalid encrypted data format');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
