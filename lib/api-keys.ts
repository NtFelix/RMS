import crypto from "crypto";

export interface GeneratedApiKey {
  plaintext: string;
  key_hash: string;
  key_prefix: string;
}

/**
 * Generates a cryptographically secure random API key secret,
 * calculates its SHA-256 hash for database storage, and derives the prefix.
 *
 * Format: mie_<environment>_<32 bytes base64url>
 */
export function generateApiKeySecret(environment: "live" | "test" = "live"): GeneratedApiKey {
  const secret = crypto.randomBytes(32).toString("base64url");
  const plaintext = `mie_${environment}_${secret}`;
  const key_hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const key_prefix = plaintext.slice(0, 16); // e.g. mie_live_a1b2c3d4
  return { plaintext, key_hash, key_prefix };
}
