/**
 * Token Encryption Utilities
 * 
 * Provides AES-256-GCM encryption for OAuth tokens to be stored securely in the database.
 * Uses Web Crypto API for Edge runtime compatibility.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const TAG_LENGTH = 128; // bits

/**
 * Get the encryption key from environment variable
 * The key should be a 32-byte (256-bit) base64-encoded string
 */
async function getEncryptionKey(): Promise<CryptoKey> {
    const keyBase64 = process.env.TOKEN_ENCRYPTION_KEY;

    if (!keyBase64) {
        throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
    }

    // Decode base64 key
    const keyBytes = Buffer.from(keyBase64, 'base64');

    if (keyBytes.length !== 32) {
        throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte (256-bit) base64-encoded string');
    }

    return crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a plaintext token using AES-256-GCM
 * 
 * Returns base64-encoded string in format: iv:ciphertext
 * 
 * @param plaintext - The token to encrypt
 * @returns Base64-encoded encrypted token
 */
export async function encryptToken(plaintext: string): Promise<string> {
    const key = await getEncryptionKey();

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode plaintext as bytes
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv,
            tagLength: TAG_LENGTH,
        },
        key,
        plaintextBytes
    );

    // Combine IV and ciphertext, encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt an encrypted token using AES-256-GCM
 * 
 * @param encrypted - Base64-encoded encrypted token (iv:ciphertext)
 * @returns Decrypted plaintext token
 */
export async function decryptToken(encrypted: string): Promise<string> {
    const key = await getEncryptionKey();

    // Decode base64
    const combined = Buffer.from(encrypted, 'base64');

    // Extract IV and ciphertext
    const iv = combined.subarray(0, IV_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv,
            tagLength: TAG_LENGTH,
        },
        key,
        ciphertext
    );

    // Decode as text
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
}

/**
 * Generate a new encryption key for TOKEN_ENCRYPTION_KEY
 * 
 * Run this once to generate a key, then store it securely in your environment.
 * 
 * @returns Base64-encoded 256-bit key
 */
export function generateEncryptionKey(): string {
    const key = crypto.getRandomValues(new Uint8Array(32));
    return Buffer.from(key).toString('base64');
}
