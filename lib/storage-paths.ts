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

export type StoragePathErrorCode = 'INVALID_PATH' | 'LEGACY_PATH' | 'ACCESS_DENIED';

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
  if (segment.includes('..') || segment === '.') {
    throw new StoragePathError(`${label} enthält unzulässige Pfadelemente`, 'INVALID_PATH');
  }
  if (segment.includes('/') || segment.includes('\\')) {
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
 * Checks whether the current user may access the given path.
 * - legacy `user_` paths are rejected with code LEGACY_PATH
 * - the path must belong to the active organisation
 * - private paths only for the own user id
 * - shared paths only for houses in accessibleHouseIds (null = all houses, [] = none)
 * Throws StoragePathError (code ACCESS_DENIED or INVALID_PATH / LEGACY_PATH) if not allowed.
 */
export function assertPathAllowed(path: string, ctx: PathAccessContext): void {
  const parsed = parseStoragePath(path);

  if (parsed.zone === 'legacy-user') {
    throw new StoragePathError('Alter Pfad (user_) wird nicht mehr unterstützt', 'LEGACY_PATH');
  }

  if (parsed.orgId !== ctx.orgId) {
    throw new StoragePathError('Zugriff auf fremde Organisation verweigert', 'ACCESS_DENIED');
  }

  switch (parsed.zone) {
    case 'root':
      return;

    case 'private':
      if (parsed.userId !== ctx.userId) {
        throw new StoragePathError('Zugriff auf fremden privaten Bereich verweigert', 'ACCESS_DENIED');
      }
      return;

    case 'shared':
      if (parsed.houseId === undefined) {
        // Listing all house folders is only allowed without house restriction
        if (ctx.accessibleHouseIds !== null) {
          throw new StoragePathError('Zugriff auf gemeinsamen Bereich verweigert', 'ACCESS_DENIED');
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
