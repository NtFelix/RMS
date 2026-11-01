/**
 * User-facing error texts of the documents area (German, formal), without server imports so that server
 * actions, API routes and the browser share them.
 *
 * Access is decided by the database (storage policies and `get_folder_contents`): a path below a house needs
 * `wohnungen:ansehen` at apartment level and additionally `mieter:ansehen` at tenant level. The application only
 * translates the refusal. All refusals use the same texts on purpose, so that a refused folder cannot be told
 * apart from one that does not exist (no names, no existence).
 */

/** Folder view: the folder is refused or does not exist */
export const FOLDER_NOT_AVAILABLE_MESSAGE =
  'Dieser Ordner ist nicht verfügbar oder Sie haben keine Berechtigung dafür.'

/** Actions (upload, move, copy, archive, ...): the file or folder is refused or does not exist */
export const STORAGE_ACCESS_DENIED_MESSAGE =
  'Auf diese Datei oder diesen Ordner haben Sie keinen Zugriff.'

/**
 * Messages of Postgres / Supabase Storage for a refusal by row level security or missing privileges. Anchored on
 * purpose: the text must BE the database message (optionally behind ONE wrapper of our own, `Failed to copy file: ...`,
 * `Upload konnte nicht vorbereitet werden: ...`), it must not merely contain a word, because file names end up in messages (`Unauthorized-Memo.pdf`, `Rechnung 42501.pdf`).
 * Bare `Unauthorized` / `JWT expired` are session errors and are not a refusal of this folder.
 */
const PERMISSION_DENIED_PATTERN =
  /^(?:[^:]{1,80}: )?(?:new row violates row-level security policy|permission denied for\b|insufficient[_ ]privilege\b|Invalid path: )/i

/** HTTP status of Supabase Storage / PostgREST for "forbidden" (storage-js delivers it as number or string) */
const FORBIDDEN_STATUS = new Set(['403'])

/**
 * True if a database or storage error text means "not allowed" (as opposed to a technical failure or an expired
 * session). Prefer isPermissionDeniedError when the error object is at hand: it also reads the error code and status.
 */
export function isPermissionDeniedMessage(message: unknown): boolean {
  return typeof message === 'string' && PERMISSION_DENIED_PATTERN.test(message)
}

/**
 * True if an error (Postgres/PostgREST error object, Supabase StorageApiError or an `Error` that carries one) is a
 * refusal: SQLSTATE `42501`, HTTP status 403, or an anchored database message. A session error (`401`,
 * `JWT expired`, `Unauthorized`) is NOT a refusal: the caller keeps its sign-in path.
 */
export function isPermissionDeniedError(error: unknown): boolean {
  if (typeof error === 'string') return isPermissionDeniedMessage(error)
  if (typeof error !== 'object' || error === null) return false
  const { code, status, statusCode, message } = error as Record<string, unknown>
  if (code === '42501') return true
  if ([status, statusCode].some((value) => (typeof value === 'number' || typeof value === 'string') && FORBIDDEN_STATUS.has(String(value)))) {
    return true
  }
  return isPermissionDeniedMessage(message)
}

/**
 * Text for an `error` of the `get_folder_contents` RPC result: `Invalid path: ...` (house/zone/organisation not
 * accessible, English, from the database) becomes the German folder message. Other texts stay unchanged.
 */
export function mapFolderRpcError(message: string): string {
  return /^Invalid path\b/i.test(message) || isPermissionDeniedMessage(message) ? FOLDER_NOT_AVAILABLE_MESSAGE : message
}
