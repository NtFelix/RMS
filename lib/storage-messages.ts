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

/** Messages of Postgres / Supabase Storage for a refusal by row level security or missing privileges */
const PERMISSION_DENIED_PATTERN =
  /row[- ]level security|violates row|permission denied|insufficient[_ ]privilege|not authorized|unauthorized|forbidden|\b42501\b/i

/** True if a database or storage error text means "not allowed" (as opposed to a technical failure) */
export function isPermissionDeniedMessage(message: unknown): boolean {
  return typeof message === 'string' && PERMISSION_DENIED_PATTERN.test(message)
}

/**
 * Text for an `error` of the `get_folder_contents` RPC result: `Invalid path: ...` (house/zone/organisation not
 * accessible, English, from the database) becomes the German folder message. Other texts stay unchanged.
 */
export function mapFolderRpcError(message: string): string {
  return /^Invalid path\b/i.test(message) || isPermissionDeniedMessage(message) ? FOLDER_NOT_AVAILABLE_MESSAGE : message
}
