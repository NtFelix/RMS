/**
 * Token Encryption/Decryption Utilities for Deno Edge Functions
 * 
 * Uses Web Crypto API for AES-256-GCM encryption/decryption.
 * Compatible with the encryption in lib/encryption.ts
 */

const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // 96 bits for AES-GCM
const TAG_LENGTH = 128 // bits

/**
 * Get the encryption key from environment variable
 */
async function getEncryptionKey(): Promise<CryptoKey> {
    const keyBase64 = Deno.env.get('TOKEN_ENCRYPTION_KEY')

    if (!keyBase64) {
        throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set')
    }

    // Decode base64 key - Deno uses atob for base64 decoding
    const keyString = atob(keyBase64)
    const keyBytes = new Uint8Array(keyString.length)
    for (let i = 0; i < keyString.length; i++) {
        keyBytes[i] = keyString.charCodeAt(i)
    }

    if (keyBytes.length !== 32) {
        throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte (256-bit) base64-encoded string')
    }

    return crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: ALGORITHM, length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Decrypt an encrypted token using AES-256-GCM
 * 
 * @param encrypted - Base64-encoded encrypted token (iv + ciphertext)
 * @returns Decrypted plaintext token
 */
export async function decryptToken(encrypted: string): Promise<string> {
    // Check if this might be a legacy unencrypted token (JWT format: xxx.yyy.zzz)
    // JWTs have 3 base64 parts separated by dots
    if (encrypted.includes('.') && encrypted.split('.').length === 3) {
        console.log('Detected legacy unencrypted JWT token - returning as-is')
        return encrypted
    }

    // Another heuristic: encrypted tokens are base64 and should decode to binary
    // If it's a very long base64 string without dots, it's likely our encrypted format
    // If it starts with "ey" it's likely an unencrypted JWT (base64 for '{"')
    if (encrypted.startsWith('ey')) {
        console.log('Detected legacy unencrypted token (starts with ey) - returning as-is')
        return encrypted
    }

    try {
        const key = await getEncryptionKey()

        // Decode base64 - Deno uses atob
        const combinedString = atob(encrypted)
        const combined = new Uint8Array(combinedString.length)
        for (let i = 0; i < combinedString.length; i++) {
            combined[i] = combinedString.charCodeAt(i)
        }

        // Extract IV and ciphertext
        const iv = combined.slice(0, IV_LENGTH)
        const ciphertext = combined.slice(IV_LENGTH)

        // Decrypt
        const plaintext = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv,
                tagLength: TAG_LENGTH,
            },
            key,
            ciphertext
        )

        // Decode as text
        const decoder = new TextDecoder()
        return decoder.decode(plaintext)
    } catch (error) {
        // If decryption fails, it might be an unencrypted token
        // This can happen during migration from unencrypted to encrypted storage
        console.warn('Token decryption failed, checking if it might be unencrypted:', error)

        // If the token looks like a JWT or OAuth token, return it as-is
        if (encrypted.length > 100) {
            console.log('Treating as legacy unencrypted token due to decryption failure')
            return encrypted
        }

        throw error
    }
}

/**
 * Encrypt a plaintext token using AES-256-GCM
 * 
 * @param plaintext - The token to encrypt
 * @returns Base64-encoded encrypted token
 */
export async function encryptToken(plaintext: string): Promise<string> {
    const key = await getEncryptionKey()

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Encode plaintext as bytes
    const encoder = new TextEncoder()
    const plaintextBytes = encoder.encode(plaintext)

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv,
            tagLength: TAG_LENGTH,
        },
        key,
        plaintextBytes
    )

    // Combine IV and ciphertext, encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)

    // Convert to base64 - Deno uses btoa
    let binary = ''
    for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i])
    }
    return btoa(binary)
}
