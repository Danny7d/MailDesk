import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derives a key from the encryption secret using PBKDF2
 */
function getKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns a base64-encoded string containing salt, IV, auth tag, and ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const tag = cipher.getAuthTag();
  
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64-encoded string using AES-256-GCM
 * Returns the original plaintext string
 */
export function decrypt(ciphertext: string, secret: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
  const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
  const encrypted = buffer.subarray(ENCRYPTED_POSITION);
  
  const key = getKey(secret, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Validates that the encryption secret is properly configured
 */
export function validateEncryptionSecret(secret: string | undefined): boolean {
  if (!secret) return false;
  // Key must be at least 32 characters for AES-256
  return secret.length >= 32;
}
