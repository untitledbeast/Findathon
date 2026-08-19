import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from server environment secret.
 * Priority: TOKEN_ENCRYPTION_KEY -> ENCRYPTION_KEY -> SUPABASE_JWT_SECRET -> development fallback.
 * NOTE: Never expose this key to client-side code.
 */
function getSecretKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY ||
                 process.env.ENCRYPTION_KEY ||
                 process.env.SUPABASE_JWT_SECRET ||
                 'findathon-default-development-encryption-key-32';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive string (e.g. OAuth access token) using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex-encoded)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts encrypted string using AES-256-GCM.
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return '';
  const parts = encryptedToken.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getSecretKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
