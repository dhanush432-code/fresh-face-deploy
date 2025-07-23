import { createCipheriv, createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV as string;

console.log(`Using encryption key: ${ENCRYPTION_KEY ? 'defined' : 'undefined'}`);
console.log(`Using encryption IV: ${ENCRYPTION_IV ? 'defined' : 'undefined'}`);



if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
  throw new Error('ENCRYPTION_KEY and ENCRYPTION_IV must be defined in your environment variables.');
}

// Convert hex string keys to Buffers for the crypto module
const key = Buffer.from(ENCRYPTION_KEY, 'hex');
const iv = Buffer.from(ENCRYPTION_IV, 'hex');

if (key.length !== 32 || iv.length !== 16) {
    throw new Error('Invalid ENCRYPTION_KEY or ENCRYPTION_IV length. Key must be 32 bytes (64 hex characters) and IV 16 bytes (32 hex characters).');
}

/**
 * Encrypts a string using AES-256-CBC algorithm.
 */
export function encrypt(text: string): string {
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypts a string using AES-256-CBC algorithm.
 */
export function decrypt(hash: string): string {
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(hash, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error("Decryption failed for hash:", hash, error);
    return "Decryption Error"; // Return a noticeable string on error
  }
}

/**
 * Creates a one-way SHA-256 hash for searchable fields.
 */
export function createSearchHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}