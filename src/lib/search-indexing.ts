// lib/search-indexing.ts

import crypto from 'crypto';

// Read the secret key from your .env.local file
const SEARCH_INDEX_SECRET = process.env.SEARCH_INDEX_SECRET;

// A crucial safety check to ensure the key is loaded
if (!SEARCH_INDEX_SECRET) {
  throw new Error('CRITICAL: SEARCH_INDEX_SECRET is not defined in environment variables.');
}

/**
 * Creates a secure, deterministic, keyed hash (HMAC) of a given value.
 * @param {string} value - The string to hash (e.g., a phone number prefix).
 * @returns {string} The resulting HMAC-SHA256 hash.
 */
export function createBlindIndex(value: string): string {
  return crypto
    .createHmac('sha256', SEARCH_INDEX_SECRET)
    .update(value)
    .digest('hex');
}

/**
 * Generates an array of prefixes from a phone number string.
 * For "9876", it will produce ["9", "98", "987", "9876"].
 * @param {string} input - The phone number.
 * @returns {string[]} An array of prefixes.
 */
export function generateNgrams(input: string): string[] {
  // Sanitize the input to only use digits, making it consistent.
  const cleanInput = input.replace(/[^0-9]/g, ''); 
  
  if (!cleanInput) {
    return [];
  }
  
  const ngrams = new Set<string>();
  // Loop through the number and create a substring from the start to the current position.
  for (let i = 1; i <= cleanInput.length; i++) {
    ngrams.add(cleanInput.substring(0, i));
  }
  
  return Array.from(ngrams);
}