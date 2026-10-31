/**
 * Storage path builder, parser and access check for the org-based bucket layout
 * (bucket `documents`).
 *
 *   org_{orgId}/shared/{houseId}/...   house-related documents, access via house rights
 *   org_{orgId}/private/{userId}/...   personal storage of one user
 *   user_{userId}/...                  legacy layout, not writable anymore, only recognised
 *                                      by the parser so that callers can show a clear error
 *
 * Paths are validated strictly: invalid input throws instead of being sanitized silently.
 */

export const ORG_PREFIX = 'org_';
export const LEGACY_USER_PREFIX = 'user_';
export const SHARED_SEGMENT = 'shared';
export const PRIVATE_SEGMENT = 'private';
export const ARCHIVE_SEGMENT = '__archive__';

const MAX_PATH_LENGTH = 1000;
const MAX_SEGMENT_LENGTH = 255;
// Control characters including NUL
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

export type StorageZone = 'root' | 'shared' | 'private' | 'legacy-user';

export interface ParsedStoragePath {
  zone: StorageZone;
  orgId: string | null;
  houseId?: string;
  userId?: string;
  rest: string[];
}

export interface PathAccessContext {
  orgId: string;
  userId: string;
  /** null = all houses of the org, [] = no house at all */
  accessibleHouseIds: string[] | null;
}

export type StoragePathErrorCode = 'INVALID_PATH' | 'INVALID_NAME' | 'LEGACY_PATH' | 'ACCESS_DENIED';

export class StoragePathError extends Error {
  readonly code: StoragePathErrorCode;

  constructor(message: string, code: StoragePathErrorCode) {
    super(message);
    this.name = 'StoragePathError';
    this.code = code;
  }
}

function assertSafeSegment(segment: string, label: string): string {
  if (typeof segment !== 'string' || segment.length === 0) {
    throw new StoragePathError(`${label} darf nicht leer sein`, 'INVALID_PATH');
  }
  // Only the whole segment may not be a traversal element: file names like `Vertrag..pdf` are legitimate.
  // Since '/' is the only separator and is rejected below, `..` inside a name cannot climb up a level.
  if (segment === '..' || segment === '.') {
    throw new StoragePathError(`${label} enthält unzulässige Pfadelemente`, 'INVALID_PATH');
  }
  if (segment.includes('/')) {
    throw new StoragePathError(`${label} enthält einen Pfadtrenner`, 'INVALID_PATH');
  }
  if (CONTROL_CHARS.test(segment)) {
    throw new StoragePathError(`${label} enthält Steuerzeichen`, 'INVALID_PATH');
  }
  if (segment.length > MAX_SEGMENT_LENGTH) {
    throw new StoragePathError(`${label} ist zu lang`, 'INVALID_PATH');
  }
  return segment;
}

function joinChecked(parts: string[]): string {
  const path = parts.join('/');
  if (path.length > MAX_PATH_LENGTH) {
    throw new StoragePathError(`Pfad ist zu lang (max. ${MAX_PATH_LENGTH} Zeichen)`, 'INVALID_PATH');
  }
  return path;
}

/** Root folder of an organisation: `org_{orgId}` */
export function orgRoot(orgId: string): string {
  return `${ORG_PREFIX}${assertSafeSegment(orgId, 'orgId')}`;
}

/** Zone root of the shared area: `org_{orgId}/shared` (label in UI: "Gemeinsam") */
export function sharedRoot(orgId: string): string {
  return `${orgRoot(orgId)}/${SHARED_SEGMENT}`;
}

/** Zone root of one user's private area: `org_{orgId}/private/{userId}` (label in UI: "Privat") */
export function privateRoot(orgId: string, userId: string): string {
  return privatePath(orgId, userId);
}

/** Shared (house-related) path: `org_{orgId}/shared/{houseId}/...segments` */
export function sharedPath(orgId: string, houseId: string, ...segments: string[]): string {
  return joinChecked([
    orgRoot(orgId),
    SHARED_SEGMENT,
    assertSafeSegment(houseId, 'houseId'),
    ...segments.map((segment) => assertSafeSegment(segment, 'Pfadsegment')),
  ]);
}

/** Private path of one user: `org_{orgId}/private/{userId}/...segments` */
export function privatePath(orgId: string, userId: string, ...segments: string[]): string {
  return joinChecked([
    orgRoot(orgId),
    PRIVATE_SEGMENT,
    assertSafeSegment(userId, 'userId'),
    ...segments.map((segment) => assertSafeSegment(segment, 'Pfadsegment')),
  ]);
}

/**
 * Parses a storage path into zone and identifiers.
 * Throws StoragePathError for traversal, empty segments, leading/trailing slashes,
 * NUL/control characters and unknown layouts.
 */
export function parseStoragePath(path: string): ParsedStoragePath {
  if (typeof path !== 'string' || path.length === 0) {
    throw new StoragePathError('Pfad darf nicht leer sein', 'INVALID_PATH');
  }
  if (path.length > MAX_PATH_LENGTH) {
    throw new StoragePathError(`Pfad ist zu lang (max. ${MAX_PATH_LENGTH} Zeichen)`, 'INVALID_PATH');
  }
  if (path.startsWith('/') || path.endsWith('/')) {
    throw new StoragePathError('Pfad darf nicht mit "/" beginnen oder enden', 'INVALID_PATH');
  }

  const [head, ...tail] = path.split('/').map((segment) => assertSafeSegment(segment, 'Pfadsegment'));

  if (head.startsWith(LEGACY_USER_PREFIX)) {
    const userId = assertSafeSegment(head.slice(LEGACY_USER_PREFIX.length), 'userId');
    return { zone: 'legacy-user', orgId: null, userId, rest: tail };
  }

  if (!head.startsWith(ORG_PREFIX)) {
    throw new StoragePathError('Unbekanntes Pfadformat', 'INVALID_PATH');
  }
  const orgId = assertSafeSegment(head.slice(ORG_PREFIX.length), 'orgId');

  if (tail.length === 0) {
    return { zone: 'root', orgId, rest: [] };
  }

  const [zoneSegment, idSegment, ...rest] = tail;

  if (zoneSegment === SHARED_SEGMENT) {
    if (idSegment === undefined) {
      return { zone: 'shared', orgId, rest: [] };
    }
    return { zone: 'shared', orgId, houseId: idSegment, rest };
  }

  if (zoneSegment === PRIVATE_SEGMENT) {
    if (idSegment === undefined) {
      return { zone: 'private', orgId, rest: [] };
    }
    return { zone: 'private', orgId, userId: idSegment, rest };
  }

  throw new StoragePathError('Unbekannte Speicherzone', 'INVALID_PATH');
}

/** Org id of a path, or null if the path has no valid org layout (never throws). */
export function orgIdOfPath(path: string): string | null {
  try {
    return parseStoragePath(path).orgId;
  } catch {
    return null;
  }
}

/** Org root of a path, or null if the path has no valid org layout (never throws). */
export function orgRootOfPath(path: string): string | null {
  const orgId = orgIdOfPath(path);
  return orgId === null ? null : orgRoot(orgId);
}

/**
 * Child path `parentPath/name`: parses the parent, validates `name` as a single safe segment
 * and returns the target path. Routes check access on exactly this string and use it for storage
 * and metadata, so no unvalidated name ever reaches the storage call.
 * Throws INVALID_NAME for an unsafe name, INVALID_PATH if the parent is the org root or a zone root
 * (their children are house/user folders, never files or folders created by a user).
 * Access is NOT checked here, callers pass the result to checkStoragePathAccess.
 */
export function childPath(parentPath: string, name: string): string {
  const parsed = parseStoragePath(parentPath);
  try {
    assertSafeSegment(name, 'Name');
  } catch (error) {
    // Lets routes tell a bad name (400) from a bad or forbidden parent path (403)
    if (error instanceof StoragePathError) {
      throw new StoragePathError(error.message, 'INVALID_NAME');
    }
    throw error;
  }
  // Legacy `user_` parents pass through on purpose: the access check decides (read-only exception)
  if (parsed.zone === 'root' || (parsed.zone === 'shared' && parsed.houseId === undefined) || (parsed.zone === 'private' && parsed.userId === undefined)) {
    throw new StoragePathError('In diesem Ordner kann nichts angelegt werden', 'INVALID_PATH');
  }
  return joinChecked([parentPath, name]);
}

/** True if the path points into (or at) an `__archive__` folder of a zone */
export function isArchivePath(path: string): boolean {
  return parseStoragePath(path).rest[0] === ARCHIVE_SEGMENT;
}

export type PathAccessMode = 'read' | 'write';

/**
 * Checks whether the current user may access the given path.
 * - legacy `user_` paths are rejected with code LEGACY_PATH
 * - the path must belong to the active organisation
 * - private paths only for the own user id
 * - shared paths only for houses in accessibleHouseIds (null = all houses, [] = none)
 *
 * mode 'read' (default) additionally allows the browsable roots `org_X`, `org_X/shared` and
 * `org_X/private` for every member of the organisation: they are the only entry into the house
 * list and the own folder. What they contain is filtered by the get_folder_contents RPC.
 * mode 'write' only allows paths deep enough to hold real objects: `shared/{house}[/...]`
 * (house in scope) and `private/{ownUserId}[/...]`, never the three roots. The house/user folder
 * itself is allowed as a parent folder of a new object.
 *
 * Throws StoragePathError (code ACCESS_DENIED or INVALID_PATH / LEGACY_PATH) if not allowed.
 */
export function assertPathAllowed(path: string, ctx: PathAccessContext, mode: PathAccessMode = 'read'): void {
  const parsed = parseStoragePath(path);

  if (parsed.zone === 'legacy-user') {
    throw new StoragePathError('Alter Pfad (user_) wird nicht mehr unterstützt', 'LEGACY_PATH');
  }

  if (parsed.orgId !== ctx.orgId) {
    throw new StoragePathError('Zugriff auf fremde Organisation verweigert', 'ACCESS_DENIED');
  }

  switch (parsed.zone) {
    case 'root':
      if (mode === 'write') {
        throw new StoragePathError('Schreiben im Wurzelordner nicht erlaubt', 'ACCESS_DENIED');
      }
      return;

    case 'private':
      if (parsed.userId === undefined && mode === 'read') {
        return;
      }
      if (parsed.userId !== ctx.userId) {
        throw new StoragePathError('Zugriff auf fremden privaten Bereich verweigert', 'ACCESS_DENIED');
      }
      return;

    case 'shared':
      if (parsed.houseId === undefined) {
        // The house list is the entry point for everybody (the RPC filters it by house scope)
        if (mode === 'write') {
          throw new StoragePathError('Schreiben im gemeinsamen Bereich ohne Haus nicht erlaubt', 'ACCESS_DENIED');
        }
        return;
      }
      if (ctx.accessibleHouseIds !== null && !ctx.accessibleHouseIds.includes(parsed.houseId)) {
        throw new StoragePathError('Zugriff auf dieses Haus verweigert', 'ACCESS_DENIED');
      }
      return;
  }
}

/**
 * Archive location of a file or folder inside its zone:
 *   org_{org}/shared/{houseId}/{rel...}  ->  org_{org}/shared/{houseId}/__archive__/{timestamp}/{rel...}
 *   org_{org}/private/{uid}/{rel...}     ->  org_{org}/private/{uid}/__archive__/{timestamp}/{rel...}
 * Visible to everyone with house rights (shared) or to the owner only (private).
 * Throws for zone roots, house folders, legacy paths and already archived paths.
 */
export function archivePathFor(path: string, timestamp: string): string {
  const parsed = parseStoragePath(path);
  assertSafeSegment(timestamp, 'timestamp');
  if (parsed.rest.length === 0 || parsed.rest[0] === ARCHIVE_SEGMENT) {
    throw new StoragePathError('Pfad kann nicht archiviert werden', 'INVALID_PATH');
  }
  if (parsed.zone === 'shared' && parsed.houseId !== undefined) {
    return joinChecked([sharedPath(parsed.orgId as string, parsed.houseId), ARCHIVE_SEGMENT, timestamp, ...parsed.rest]);
  }
  if (parsed.zone === 'private' && parsed.userId !== undefined) {
    return joinChecked([privatePath(parsed.orgId as string, parsed.userId), ARCHIVE_SEGMENT, timestamp, ...parsed.rest]);
  }
  throw new StoragePathError('Pfad liegt nicht in einer archivierbaren Zone', 'INVALID_PATH');
}

/** Timestamp segment of an archive folder, e.g. `2026-10-29T10-00-00-000Z` (ISO string without `:` and `.`) */
export function archiveTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** Inverse of archiveTimestamp, null if the segment is not a valid archive timestamp */
export function archiveTimestampToDate(timestamp: string): Date | null {
  const iso = timestamp.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1T$2:$3:$4.$5Z');
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Reads an archive path. Returns the original path (zone + relative path) and the archive
 * timestamp, or null if the path is not an archive path. Throws on invalid paths.
 */
export function parseArchivePath(path: string): { originalPath: string; timestamp: string } | null {
  const parsed = parseStoragePath(path);
  if (parsed.rest[0] !== ARCHIVE_SEGMENT || parsed.rest.length < 2) {
    return null;
  }
  const timestamp = parsed.rest[1];
  const relative = parsed.rest.slice(2);
  if (parsed.zone === 'shared' && parsed.houseId !== undefined) {
    return { originalPath: joinChecked([sharedPath(parsed.orgId as string, parsed.houseId), ...relative]), timestamp };
  }
  if (parsed.zone === 'private' && parsed.userId !== undefined) {
    return { originalPath: joinChecked([privatePath(parsed.orgId as string, parsed.userId), ...relative]), timestamp };
  }
  return null;
}

/**
 * TRANSITION (GH-27 PR 2 -> PR 3): legacy `user_{uid}` paths stay readable for their own owner
 * until the backfill has moved them. This is a read-only exception, never write, never other users.
 * TODO(GH-27 PR3): remove together with the legacy storage policies.
 */
export function isOwnLegacyPath(path: string, userId: string): boolean {
  try {
    const parsed = parseStoragePath(path);
    return parsed.zone === 'legacy-user' && parsed.userId === userId;
  } catch {
    return false;
  }
}

/**
 * Escapes `\`, `%` and `_` so that the string only matches itself in a LIKE pattern
 * (Postgres default escape character is the backslash).
 * Note: PostgREST additionally turns a literal `*` of a like/ilike value into `%` and offers no escape for
 * it, so callers that need an exact set also filter the rows afterwards (see isPathInFolder).
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Quotes a value for a PostgREST logic filter (`.or()`): reserved characters such as `,` `.` `(` `)` stay literal */
function quotePostgrestValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`;
}

/**
 * Filter string for `.or()` on Dokumente_Metadaten that selects exactly the files of a folder and of
 * its sub-folders: `dateipfad = folder OR dateipfad LIKE 'folder/%'`. A plain `LIKE 'folder%'` would also
 * match sibling folders (`Rechnungen` -> `Rechnungen2`), and `%`/`_` in the folder name would act as wildcards.
 */
export function folderMetadataFilter(folderPath: string, column = 'dateipfad'): string {
  const folder = folderPath.replace(/\/+$/, '');
  return [
    `${column}.eq.${quotePostgrestValue(folder)}`,
    `${column}.like.${quotePostgrestValue(`${escapeLikePattern(folder)}/%`)}`,
  ].join(',');
}

/** True if `dateipfad` is the folder itself or lies below it (exact check, no wildcards) */
export function isPathInFolder(dateipfad: string, folderPath: string): boolean {
  const folder = folderPath.replace(/\/+$/, '');
  return dateipfad === folder || dateipfad.startsWith(`${folder}/`);
}
