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

/** Folder deletion: part of the contents was removed, the rest is refused (no names, no counts) */
export const FOLDER_PARTIALLY_DELETED_MESSAGE =
  'Der Ordner wurde nur teilweise gelöscht. Auf einen Teil des Inhalts haben Sie keinen Zugriff.'

/**
 * The wrappers of our own code around a database message (`${wrapper}: ${error.message}` in lib/storage-operations.ts).
 * Only these exact texts are accepted in front of the database phrase, never a free prefix: user input (a file name
 * after a colon, `Datei existiert bereits: permission denied for foo.pdf`) must not look like a refusal.
 */
const KNOWN_WRAPPERS = [
  'Failed to save file metadata',
  'Upload failed',
  'Upload konnte nicht vorbereitet werden',
  'Dateien konnten nicht geladen werden',
  'Archiv konnte nicht geladen werden',
  'Failed to delete files',
  'Failed to update metadata',
  'Failed to copy file to target location',
  'Failed to copy file',
  'Failed to create signed URL',
  'Could not scan folder',
]

/**
 * Messages of Postgres / Supabase Storage for a refusal by row level security or missing privileges. Anchored on
 * purpose: the text must BE the database message (optionally behind ONE of KNOWN_WRAPPERS), it must not merely
 * contain a word, because file names end up in messages (`Unauthorized-Memo.pdf`, `Rechnung 42501.pdf`). The
 * `permission denied for` of Postgres is followed by the kind of object (`table`, `schema`, ...), never by a free name.
 * Bare `Unauthorized` / `JWT expired` are session errors and are not a refusal of this folder.
 */
const PERMISSION_DENIED_PATTERN = new RegExp(
  `^(?:(?:${KNOWN_WRAPPERS.join('|')}): )?` +
    '(?:new row violates row-level security policy' +
    '|permission denied for (?:table|relation|view|schema|function|sequence|database|type|column)\\b' +
    '|insufficient[_ ]privilege\\b' +
    '|Invalid path: )',
  'i',
)

/** HTTP status of Supabase Storage / PostgREST for "forbidden" (storage-js delivers it as number or string) */
const FORBIDDEN_STATUS = new Set(['403'])

/**
 * Name (`error` field) that Supabase Storage sends with a 403 for a refusal by the policies. Not user-controlled, unlike
 * the message. A 403 without it (quota, size limit, ...) is not a refusal of the object by RLS.
 */
const FORBIDDEN_ERROR_NAMES = new Set(['unauthorized', 'forbidden', 'accessdenied', 'access denied'])

/**
 * True if a database or storage error text means "not allowed" (as opposed to a technical failure or an expired
 * session). Prefer isPermissionDeniedError when the error object is at hand: it also reads the error code and status.
 */
export function isPermissionDeniedMessage(message: unknown): boolean {
  return typeof message === 'string' && PERMISSION_DENIED_PATTERN.test(message)
}

/**
 * True if an error (Postgres/PostgREST error object, Supabase StorageApiError or an `Error` that carries one) is a
 * refusal: SQLSTATE `42501`, an anchored database message, or HTTP status 403 together with the error name of a
 * policy refusal (`Unauthorized`, `Forbidden`, `AccessDenied`). A session error (`401`,
 * `JWT expired`, `Unauthorized`) is NOT a refusal: the caller keeps its sign-in path.
 */
export function isPermissionDeniedError(error: unknown): boolean {
  if (typeof error === 'string') return isPermissionDeniedMessage(error)
  if (typeof error !== 'object' || error === null) return false
  const { code, status, statusCode, message, error: errorName } = error as Record<string, unknown>
  if (code === '42501') return true
  if (isPermissionDeniedMessage(message)) return true
  // 403 alone is not enough (a size or quota refusal is a 403 too): it must come with the error name of a policy refusal
  const forbidden = [status, statusCode].some(
    (value) => (typeof value === 'number' || typeof value === 'string') && FORBIDDEN_STATUS.has(String(value)),
  )
  return forbidden && typeof errorName === 'string' && FORBIDDEN_ERROR_NAMES.has(errorName.trim().toLowerCase())
}

/**
 * Text for an `error` of the `get_folder_contents` RPC result: `Invalid path: ...` (house/zone/organisation not
 * accessible, English, from the database) becomes the German folder message. Other texts stay unchanged.
 */
export function mapFolderRpcError(message: string): string {
  return /^Invalid path\b/i.test(message) || isPermissionDeniedMessage(message) ? FOLDER_NOT_AVAILABLE_MESSAGE : message
}
