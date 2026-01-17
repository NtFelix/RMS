import { encryptToken, decryptToken, generateEncryptionKey } from './encryption';

// Polyfill Web Crypto API for Node.js environment
const { webcrypto } = require('node:crypto');
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true
});

describe('encryption', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Generate a valid key for testing
    process.env.TOKEN_ENCRYPTION_KEY = generateEncryptionKey();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 32-byte base64 key', () => {
      const key = generateEncryptionKey();
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });
  });

  describe('encryptToken and decryptToken', () => {
    it('should encrypt and decrypt correctly', async () => {
      const token = 'my-secret-token-123';
      const encrypted = await encryptToken(token);

      expect(encrypted).not.toBe(token);
      expect(typeof encrypted).toBe('string');

      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('should handle special characters', async () => {
      const token = 'Token with spaces and symbols!@#$%^&*()';
      const encrypted = await encryptToken(token);
      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('should fail if key is missing', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      await expect(encryptToken('test')).rejects.toThrow('TOKEN_ENCRYPTION_KEY environment variable is not set');
    });

    it('should fail if key is invalid length', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = Buffer.from('short-key').toString('base64');
      await expect(encryptToken('test')).rejects.toThrow('TOKEN_ENCRYPTION_KEY must be a 32-byte (256-bit) base64-encoded string');
    });

    it('should fail decryption with wrong key', async () => {
      const token = 'secret';
      const encrypted = await encryptToken(token);

      // Change key
      process.env.TOKEN_ENCRYPTION_KEY = generateEncryptionKey();

      await expect(decryptToken(encrypted)).rejects.toThrow();
    });
  });
});
