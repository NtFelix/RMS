export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSupabasePublicEnv() {
  const isDev = process.env.NEXT_PUBLIC_DEV === 'true' || process.env.DEV === 'true';

  const url = isDev
    ? (process.env.NEXT_PUBLIC_DEV_SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  const anonKey = isDev
    ? (process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY || process.env.DEV_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

  return { url, anonKey };
}

export function getSupabaseServerEnv() {
  const { url, anonKey } = getSupabasePublicEnv();
  const isDev = process.env.NEXT_PUBLIC_DEV === 'true' || process.env.DEV === 'true';

  const serviceKey = isDev
    ? (process.env.DEV_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  return { url, anonKey, serviceKey };
}

/**
 * Normalizes and validates raw organisation ID cookie or override values.
 * Returns the valid UUID string, or null if unset or set to a sentinel value ('private', 'null', empty).
 */
export function sanitizeOrgId(rawOrgId?: string | null): string | null {
  if (!rawOrgId) return null;
  const trimmed = rawOrgId.trim();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Determines whether an invalid organisation ID string is an unexpected value
 * that warrants a development warning (ignoring standard sentinels like 'private', 'null', and whitespace).
 */
export function shouldLogOrgWarning(rawOrgId?: string | null): boolean {
  if (!rawOrgId) return false;
  const normalized = rawOrgId.trim().toLowerCase();
  if (normalized === '' || normalized === 'private' || normalized === 'null' || normalized === 'undefined') {
    return false;
  }
  return !UUID_REGEX.test(normalized);
}

/**
 * Builds the global Cookie header object for Supabase server clients
 * when a valid organisation ID is present.
 */
export function getOrgCookieHeader(rawOrgId?: string | null, callerTag?: string): Record<string, string> {
  const currentOrgId = sanitizeOrgId(rawOrgId);
  const headers: Record<string, string> = {};

  if (currentOrgId) {
    headers['Cookie'] = `current_organisation_id=${encodeURIComponent(currentOrgId)}`;
  } else if (callerTag && process.env.NODE_ENV === 'development' && shouldLogOrgWarning(rawOrgId)) {
    console.warn(`[${callerTag}] Invalid current_organisation_id format (expected UUID):`, rawOrgId);
  }

  return headers;
}

