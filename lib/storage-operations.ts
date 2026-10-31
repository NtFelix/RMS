/**
 * Server-side storage operations of the documents bucket (GH-27, option A).
 *
 * The browser cannot send the `current_organisation_id` cookie to Supabase Storage, so every operation runs
 * here with the server client (which forwards the cookie): the access checks of storage.objects and
 * Dokumente_Metadaten then apply to the organisation the user has selected, not to the fallback one.
 * Only the byte transfer of an upload runs in the browser, with a signed upload URL (prepareUpload) that
 * is bound to exactly one path. Called by app/(dashboard)/dateien/storage-actions.ts, the browser
 * facade is lib/storage-service.ts.
 *
 * Paths: every path is validated strictly against the active organisation and the house scope
 * (lib/storage-paths.ts), invalid input throws instead of being repaired. Only a path that creates a NEW
 * name (prepareUpload, createPlaceholder) is normalised once (pathUtils.sanitizePath, which also drops
 * characters like `: ? * < > " |`) before it is validated; the validated string is then the one that is
 * checked, written to storage and stored in Dokumente_Metadaten. Existing paths (read, download, signed
 * URL, move, delete) come from the database and are validated as they are, never rewritten.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureAuth } from '@/lib/auth-utils';
import { pathUtils, isKeepFile } from './path-utils';
import {
  ARCHIVE_SEGMENT,
  StoragePathError,
  archivePathFor,
  archiveTimestamp,
  assertPathAllowed,
  childPath,
  escapeLikePattern,
  folderMetadataFilter,
  isArchivePath,
  isPathInFolder,
  orgRoot,
  parseArchivePath,
  parseStoragePath,
  privateRoot,
  sharedRoot,
  type PathAccessContext,
  type PathAccessMode,
} from '@/lib/storage-paths';
import { validateFileInfo } from '@/lib/storage-file-rules';
import { STORAGE_ACCESS_DENIED_MESSAGE } from '@/lib/storage-messages';

export interface StorageObject {
  name: string;
  /** Full storage path, set for archive listings */
  path?: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
  size: number;
}

/** Maps a Dokumente_Metadaten row to a StorageObject (extra: e.g. the full path for archive listings) */
function toStorageObject(item: any, extra?: Partial<StorageObject>): StorageObject {
  return {
    name: item.dateiname,
    ...extra,
    id: item.id,
    updated_at: item.aktualisierungsdatum || new Date().toISOString(),
    created_at: item.erstellungsdatum || new Date().toISOString(),
    last_accessed_at: item.letzter_zugriff || new Date().toISOString(),
    metadata: { mimetype: item.mime_type, size: item.dateigroesse },
    size: Number(item.dateigroesse) || 0,
  };
}

// Storage bucket name
const STORAGE_BUCKET = 'documents';

/** Signed download URLs: short by default, a share link may live up to a week (the share dialog's maximum) */
export const DEFAULT_SIGNED_URL_SECONDS = 300;
export const MAX_SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Access context of one operation: the server client (carries the organisation cookie), the active
 * organisation, the user and the house scope. Fail-closed: if the house scope cannot be resolved, an error is thrown.
 * Costs three round trips (auth user, organisation, house scope): an operation that validates several
 * paths (archive, restore, move folder, bulk) builds it once and passes it on to the internal helpers.
 */
export interface StorageContext extends PathAccessContext {
  supabase: SupabaseClient;
  /** House lookups of this operation (write mode, see validateStoragePath), shared by concurrent validations */
  knownHouses: Map<string, Promise<boolean>>;
}

export async function getStorageContext(): Promise<StorageContext> {
  const { supabase, user } = await ensureAuth();

  const [{ data: orgId, error: orgError }, { data: houseIds, error: houseError }] = await Promise.all([
    supabase.rpc('current_organisation_id'),
    supabase.rpc('get_accessible_haeuser_ids'),
  ]);
  if (orgError || !orgId) {
    throw new Error('No active organisation');
  }
  if (houseError) {
    throw new Error('Could not resolve house scope');
  }

  return {
    supabase,
    orgId: orgId as string,
    userId: user.id,
    accessibleHouseIds: (houseIds as string[] | null) ?? null,
    knownHouses: new Map(),
  };
}

/**
 * Validates a storage path against the active organisation and the house scope
 * (see lib/storage-paths.ts). Throws StoragePathError on violation.
 * Reading may browse the zone roots, every write must target a house or the own private folder. In write mode
 * the house of a `shared/{houseId}/...` path must also exist in the active organisation (one lookup per house):
 * a user without house restriction passes the scope check for any house id, writing must not invent one.
 * Without `ctx` the access context is built for this one call, operations with several paths pass theirs.
 */
export async function validateStoragePath(path: string, mode: PathAccessMode = 'read', ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  assertPathAllowed(path, context, mode);

  if (mode === 'write') {
    const { zone, houseId } = parseStoragePath(path);
    if (zone === 'shared' && houseId !== undefined) {
      let lookup = context.knownHouses.get(houseId);
      if (!lookup) {
        // RLS limits Haeuser to the active organisation
        lookup = (async () => {
          const { data, error } = await context.supabase.from('Haeuser').select('id').eq('id', houseId).maybeSingle();
          return !error && !!data;
        })();
        context.knownHouses.set(houseId, lookup);
      }
      if (!(await lookup)) {
        throw new StoragePathError('Haus nicht gefunden', 'ACCESS_DENIED');
      }
    }
  }
}

/**
 * Write check of the public operations (upload, move, rename, copy, placeholder, folder move): like
 * validateStoragePath in write mode, but never inside `__archive__` - only archiveFile/restoreFile
 * (internal, they call validateStoragePath) move files in and out of an archive. `notFolderRoot` also refuses
 * the root folder of a house or of the own private zone (moving it would take its archive along).
 */
async function validateWritablePath(
  path: string,
  ctx: StorageContext,
  options: { notFolderRoot?: boolean } = {},
): Promise<void> {
  await validateStoragePath(path, 'write', ctx);
  if (isArchivePath(path)) {
    throw new StoragePathError('Das Archiv kann nicht direkt verändert werden', 'ACCESS_DENIED');
  }
  if (options.notFolderRoot && parseStoragePath(path).rest.length === 0) {
    throw new StoragePathError('Der Wurzelordner kann nicht verändert werden', 'ACCESS_DENIED');
  }
}

/** Splits a path into its directory and file name (as stored in Dokumente_Metadaten) */
function splitPath(path: string): { directory: string; fileName: string } {
  const segments = path.split('/');
  const fileName = segments.pop() ?? '';
  return { directory: segments.join('/'), fileName };
}

/** Creates or updates the Dokumente_Metadaten row of a stored file */
async function saveMetadata(ctx: StorageContext, path: string, size: number, mimeType: string): Promise<void> {
  const { directory, fileName } = splitPath(path);

  // Check if the file already exists in the DB (upsert)
  const { data: existingFile } = await ctx.supabase
    .from('Dokumente_Metadaten')
    .select('id')
    .eq('dateipfad', directory)
    .eq('dateiname', fileName)
    .single();

  const now = new Date().toISOString();
  const { error } = existingFile
    ? await ctx.supabase
        .from('Dokumente_Metadaten')
        .update({ dateigroesse: size, mime_type: mimeType, aktualisierungsdatum: now, letzter_zugriff: now })
        .eq('id', existingFile.id)
    : await ctx.supabase
        .from('Dokumente_Metadaten')
        .insert({ dateipfad: directory, dateiname: fileName, dateigroesse: size, mime_type: mimeType });

  if (error) {
    throw new Error(`Failed to save file metadata: ${error.message}`);
  }
}

/** Whether Dokumente_Metadaten already has a row for the path (the file existed before this upload) */
async function hasMetadata(ctx: StorageContext, path: string): Promise<boolean> {
  const { directory, fileName } = splitPath(path);
  const { data } = await ctx.supabase
    .from('Dokumente_Metadaten')
    .select('id')
    .eq('dateipfad', directory)
    .eq('dateiname', fileName)
    .single();
  return !!data;
}

/**
 * Removes the object of a failed upload, but only a NEW one: without upsert the token cannot overwrite, so the
 * object is the one just uploaded. With upsert (or an existing metadata row) the path may hold a file the user
 * already had, a rejected overwrite must not delete it.
 */
async function removeUploadIfNew(ctx: StorageContext, path: string, upsert: boolean | undefined): Promise<void> {
  if (!upsert && !(await hasMetadata(ctx, path))) {
    await removeOrphan(ctx, path);
  }
}

/** Removes an object after a failed step so that no file without metadata stays behind (the delete trigger removes the metadata row) */
async function removeOrphan(ctx: StorageContext, path: string): Promise<void> {
  try {
    await ctx.supabase.storage.from(STORAGE_BUCKET).remove([path]);
  } catch (cleanupError) {
    console.error('CRITICAL: Failed to cleanup orphaned file:', path, cleanupError);
  }
}

/**
 * First step of an upload: checks the target and returns a signed upload URL token for exactly this path.
 * createSignedUploadUrl runs with the organisation cookie and probes the insert policy, so a path that the
 * policies would refuse gets no token. The browser transfers the bytes with the token (uploadToSignedUrl) and
 * then calls completeUpload. The token is a capability of the path: it stays valid for 2 hours
 * and, with `upsert`, can be redeemed more than once.
 */
export async function prepareUpload(
  path: string,
  options: { upsert?: boolean } = {},
  ctx?: StorageContext,
): Promise<{ path: string; token: string }> {
  const context = ctx ?? await getStorageContext();

  // A new name is created here: normalise once (also strips slashes at both ends and double slashes),
  // then validate exactly this string and use it for the access check, storage and metadata
  const targetPath = pathUtils.sanitizePath(path);
  await validateWritablePath(targetPath, context);

  const { data, error } = await context.supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(targetPath, { upsert: options.upsert === true });
  if (error || !data?.token) {
    throw new Error(`Upload konnte nicht vorbereitet werden: ${error?.message ?? 'kein Token'}`);
  }

  return { path: targetPath, token: data.token };
}

/**
 * Second step of an upload: size and type are read from storage (never taken from the client), the
 * Dokumente_Metadaten row is written. A new file that breaks the rules or whose metadata cannot be stored is removed
 * again; an overwrite (`upsert`) is never deleted, the error is only reported (the new bytes then stay in place).
 */
export async function completeUpload(
  path: string,
  options: { upsert?: boolean } = {},
  ctx?: StorageContext,
): Promise<{ path: string; size: number; mimeType: string }> {
  const context = ctx ?? await getStorageContext();
  // The path comes from prepareUpload: validated as it is, never rewritten
  await validateWritablePath(path, context);

  const { data: info, error } = await context.supabase.storage.from(STORAGE_BUCKET).info(path);
  if (error || !info) {
    throw new Error('Hochgeladene Datei wurde nicht gefunden');
  }

  const size = Number(info.size) || 0;
  const mimeType = info.contentType ?? '';
  const validation = validateFileInfo({ size, type: mimeType });
  if (!validation.valid) {
    await removeUploadIfNew(context, path, options.upsert);
    throw new Error(validation.error);
  }

  try {
    await saveMetadata(context, path, size, mimeType);
  } catch (dbError) {
    console.error('Failed to update Dokumente_Metadaten:', dbError);
    await removeUploadIfNew(context, path, options.upsert);
    throw new Error('Failed to save file metadata');
  }

  return { path, size, mimeType };
}

/** Uploads a small file from the server (folder placeholders) and stores its metadata */
async function uploadFromServer(
  ctx: StorageContext,
  path: string,
  body: Blob,
  contentType: string,
): Promise<void> {
  const { error } = await ctx.supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, body, { upsert: true, contentType });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  try {
    await saveMetadata(ctx, path, body.size, contentType);
  } catch (dbError) {
    console.error('Failed to update Dokumente_Metadaten:', dbError);
    await removeOrphan(ctx, path);
    throw new Error('Failed to save file metadata');
  }
}

/**
 * Lists files with a given prefix
 */
export async function listFiles(prefix: string, options?: ListFilesOptions, ctx?: StorageContext): Promise<StorageObject[]> {
  return listFilesInContext(prefix, options, ctx);
}

export interface ListFilesOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'updated_at' | 'size';
  sortOrder?: 'asc' | 'desc';
}

/** listFiles with an access context that the caller already resolved (archiveFolder) */
async function listFilesInContext(prefix: string, options?: ListFilesOptions, ctx?: StorageContext): Promise<StorageObject[]> {
  const context = ctx ?? await getStorageContext();
  // The prefix is an existing folder path (from the database): validated as it is, never rewritten
  await validateStoragePath(prefix, 'read', context);

  // Query Dokumente_Metadaten table instead of storage.list
  let query = context.supabase
    .from('Dokumente_Metadaten')
    .select('*')
    .eq('dateipfad', prefix);

  // Apply sorting
  const sortBy = options?.sortBy || 'name';
  const sortOrder = options?.sortOrder || 'asc';

  let dbSortColumn = 'dateiname';
  if (sortBy === 'updated_at') dbSortColumn = 'aktualisierungsdatum';
  if (sortBy === 'size') dbSortColumn = 'dateigroesse';

  query = query.order(dbSortColumn, { ascending: sortOrder === 'asc' });

  // Apply pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error querying Dokumente_Metadaten:', error);
    throw new Error(`Dateien konnten nicht geladen werden: ${error.message}`);
  }

  return (data || []).map((item) => toStorageObject(item));
}

/**
 * Archives a file inside its zone: shared/{house}/__archive__/{timestamp}/... or
 * private/{user}/__archive__/{timestamp}/... (see archivePathFor)
 */
export async function archiveFile(path: string, ctx?: StorageContext): Promise<string> {
  return archiveFileInContext(path, ctx ?? await getStorageContext());
}

async function archiveFileInContext(path: string, ctx: StorageContext): Promise<string> {
  await validateStoragePath(path, 'write', ctx);

  const archivePath = archivePathFor(path, archiveTimestamp());
  await validateStoragePath(archivePath, 'write', ctx);

  await moveFileInContext(path, archivePath, ctx);
  return archivePath;
}

/**
 * Removes files from storage. Paths the user may not write are not touched but reported in `denied`,
 * the rest is removed in one call. With `onlyArchived` only paths inside an archive are accepted
 * (permanent deletion). The Dokumente_Metadaten rows are removed by a database trigger on storage.objects
 * (see migration 20251124000003).
 */
export async function removeFiles(
  paths: string[],
  options: { onlyArchived?: boolean } = {},
  ctx?: StorageContext,
): Promise<{ removed: string[]; denied: string[] }> {
  if (paths.length === 0) return { removed: [], denied: [] };
  const context = ctx ?? await getStorageContext();

  const checks = await Promise.all(paths.map(async (path) => {
    try {
      if (options.onlyArchived && !parseArchivePath(path)) {
        throw new StoragePathError('Can only permanently delete files from archive', 'ACCESS_DENIED');
      }
      await validateStoragePath(path, 'write', context);
      return true;
    } catch (error) {
      if (!(error instanceof StoragePathError)) throw error;
      return false;
    }
  }));
  const allowed = paths.filter((_, i) => checks[i]);
  const denied = paths.filter((_, i) => !checks[i]);

  if (allowed.length > 0) {
    const { error } = await context.supabase.storage.from(STORAGE_BUCKET).remove(allowed);
    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete files: ${error.message}`);
    }
  }

  return { removed: allowed, denied };
}

/**
 * Moves a file from one path to another
 */
export async function moveFile(oldPath: string, newPath: string, ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  await Promise.all([oldPath, newPath].map((path) => validateWritablePath(path, context)));
  return moveFileInContext(oldPath, newPath, context);
}

/** moveFile with the access context of the calling operation (archive, restore, rename, folder move) */
async function moveFileInContext(oldPath: string, newPath: string, ctx: StorageContext): Promise<void> {
  await validateStoragePath(oldPath, 'write', ctx);
  await validateStoragePath(newPath, 'write', ctx);

  // Both paths are validated above (no leading/trailing or double slashes), they are used as they are.
  // cleanOldPath/cleanNewPath are only reassigned if the file name is corrected below.
  let cleanOldPath = oldPath;
  let cleanNewPath = newPath;

  const supabase = ctx.supabase;
  const bucket = supabase.storage.from(STORAGE_BUCKET);

  // Check if source file exists in DB
  const oldPathSegments = cleanOldPath.split('/');
  const sourceDirectory = oldPathSegments.slice(0, -1).join('/');
  let fileName = oldPathSegments[oldPathSegments.length - 1];

  const { data: sourceFile, error: sourceFileError } = await supabase
    .from('Dokumente_Metadaten')
    .select('*')
    .eq('dateipfad', sourceDirectory)
    .eq('dateiname', fileName)
    .single();

  if (sourceFileError || !sourceFile) {
    // Try case-insensitive search if exact match fails
    const { data: similarFiles } = await supabase
      .from('Dokumente_Metadaten')
      .select('*')
      .eq('dateipfad', sourceDirectory)
      .ilike('dateiname', escapeLikePattern(fileName)); // Case insensitive match, `_` and `%` of the name stay literal

    // A literal `*` of the name would still act as a wildcard in PostgREST, so compare the rows exactly
    const caseInsensitiveMatches = (similarFiles ?? []).filter(
      (candidate) => candidate.dateiname.toLowerCase() === fileName.toLowerCase(),
    );
    if (caseInsensitiveMatches.length > 0) {
      fileName = caseInsensitiveMatches[0].dateiname;
    } else {
      console.error('❌ Source file not found in DB:', { searchedFor: fileName, inDirectory: sourceDirectory });
      // The DB is the source of truth
      throw new Error(`Source file not found: ${fileName} in ${sourceDirectory}`);
    }
  }

  // Update paths if fileName was corrected
  cleanOldPath = `${sourceDirectory}/${fileName}`;

  const newPathSegments = cleanNewPath.split('/');
  const targetDirectory = newPathSegments.slice(0, -1).join('/');
  let targetFileName = newPathSegments[newPathSegments.length - 1];

  // If we corrected the source fileName, also update the target
  if (fileName !== oldPathSegments[oldPathSegments.length - 1]) {
    targetFileName = fileName;
    cleanNewPath = `${targetDirectory}/${targetFileName}`;
  }

  // Check if target file already exists in DB
  const { data: targetFile } = await supabase
    .from('Dokumente_Metadaten')
    .select('id')
    .eq('dateipfad', targetDirectory)
    .eq('dateiname', targetFileName)
    .single();

  if (targetFile) {
    console.warn('⚠️ Target file already exists, move will overwrite it');
  }

  // Store original path info for potential rollback
  const oldPathSegmentsForDb = cleanOldPath.split('/');
  const oldFileNameForDb = oldPathSegmentsForDb.pop()!;
  const oldDirectoryPathForDb = oldPathSegmentsForDb.join('/');

  const newPathSegmentsForDb = cleanNewPath.split('/');
  const newFileNameForDb = newPathSegmentsForDb.pop()!;
  const newDirectoryPathForDb = newPathSegmentsForDb.join('/');

  // Helper function to rollback DB changes on storage failure
  const rollbackDbChanges = async () => {
    try {
      await supabase
        .from('Dokumente_Metadaten')
        .update({
          dateipfad: oldDirectoryPathForDb,
          dateiname: oldFileNameForDb,
          aktualisierungsdatum: new Date().toISOString()
        })
        .eq('dateipfad', newDirectoryPathForDb)
        .eq('dateiname', newFileNameForDb);
    } catch (rollbackError) {
      console.error('❌ CRITICAL: Failed to rollback DB changes:', rollbackError);
    }
  };

  // Update Dokumente_Metadaten BEFORE storage move
  // This prevents the delete trigger from deleting the metadata if the move is implemented as copy+delete
  const { error: dbUpdateError } = await supabase
    .from('Dokumente_Metadaten')
    .update({
      dateipfad: newDirectoryPathForDb,
      dateiname: newFileNameForDb,
      aktualisierungsdatum: new Date().toISOString()
    })
    .eq('dateipfad', oldDirectoryPathForDb)
    .eq('dateiname', oldFileNameForDb);

  if (dbUpdateError) {
    console.error('❌ Failed to update DB metadata:', dbUpdateError);
    throw new Error(`Failed to update metadata: ${dbUpdateError.message}`);
  }

  const { error: moveError } = await bucket.move(cleanOldPath, cleanNewPath);

  // Check if the move actually worked, even if there's an error reported
  let moveActuallyWorked = false;
  if (moveError) {
    try {
      const { data: targetExists } = await bucket.exists(cleanNewPath);
      moveActuallyWorked = !!targetExists;
    } catch (checkError) {
      console.log('🔍 Could not verify target file existence:', checkError);
    }
  }

  // Check if the error is meaningful or just an empty object
  const hasRealError = moveError && !moveActuallyWorked && (
    moveError.message ||
    (moveError as any).statusCode ||
    moveError.name ||
    Object.keys(moveError).length > 0
  );

  if (hasRealError) {
    console.warn('⚠️ Direct move operation failed, trying copy + delete:', {
      errorMessage: moveError?.message || 'No error message',
      from: cleanOldPath,
      to: cleanNewPath
    });

    // Try alternative approach: copy then delete using storage.copy()
    try {
      const { error: copyError } = await bucket.copy(cleanOldPath, cleanNewPath);
      if (copyError) {
        throw new Error(`Failed to copy file to target location: ${copyError.message}`);
      }

      // Delete original file
      const { error: deleteError } = await bucket.remove([cleanOldPath]);
      if (deleteError) {
        // Don't throw error here as the file was successfully copied
        console.warn('⚠️ File copied successfully but failed to delete original:', deleteError);
      }
    } catch (alternativeError) {
      console.error('❌ Alternative move approach also failed:', alternativeError);
      // Rollback DB changes since storage operation failed
      await rollbackDbChanges();
      throw new Error(`Move operation failed. Direct move error: ${moveError?.message || 'Unknown error'}. Alternative approach error: ${alternativeError instanceof Error ? alternativeError.message : 'Unknown error'}`);
    }
  }

  // Final verification that the move was successful
  try {
    const { data: targetExists, error: finalCheckError } = await bucket.exists(cleanNewPath);
    if (finalCheckError || !targetExists) {
      throw new Error(`Move operation may have failed - file not found at target location: ${cleanNewPath}`);
    }
  } catch (finalError) {
    console.error('❌ Final verification failed:', finalError);
    // Rollback DB changes since the file is not at the target location
    await rollbackDbChanges();
    throw new Error(`Move operation verification failed: ${finalError instanceof Error ? finalError.message : 'Unknown error'}`);
  }
}

/**
 * Copies a file inside the bucket and creates the Dokumente_Metadaten row of the copy.
 * Source and target must both be writable paths (never `__archive__`).
 */
export async function copyFile(sourcePath: string, targetPath: string, ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  await Promise.all([sourcePath, targetPath].map((path) => validateWritablePath(path, context)));

  const source = splitPath(sourcePath);
  const { data: sourceRow, error: sourceError } = await context.supabase
    .from('Dokumente_Metadaten')
    .select('dateigroesse, mime_type')
    .eq('dateipfad', source.directory)
    .eq('dateiname', source.fileName)
    .single();
  if (sourceError || !sourceRow) {
    throw new Error(`Source file not found: ${source.fileName} in ${source.directory}`);
  }

  const { error: copyError } = await context.supabase.storage.from(STORAGE_BUCKET).copy(sourcePath, targetPath);
  if (copyError) {
    throw new Error(`Failed to copy file: ${copyError.message}`);
  }

  try {
    await saveMetadata(context, targetPath, Number(sourceRow.dateigroesse) || 0, sourceRow.mime_type);
  } catch (dbError) {
    console.error('Failed to update Dokumente_Metadaten:', dbError);
    await removeOrphan(context, targetPath);
    throw new Error('Failed to save file metadata');
  }
}

/** One signed URL per path; a path that is not allowed or not found gets no URL and an error message */
export interface SignedUrlResult {
  path: string;
  url: string | null;
  error?: string;
}

/**
 * Creates signed URLs for existing files (open, download, share link). The lifetime is capped
 * (MAX_SIGNED_URL_SECONDS); `download` makes the URL force a download (true) or names the file (string).
 */
export async function createSignedUrls(
  paths: string[],
  options: { expiresIn?: number; download?: boolean | string } = {},
  ctx?: StorageContext,
): Promise<SignedUrlResult[]> {
  if (paths.length === 0) return [];
  const context = ctx ?? await getStorageContext();

  const requested = Number(options.expiresIn);
  const expiresIn = Number.isFinite(requested) && requested > 0
    ? Math.min(Math.floor(requested), MAX_SIGNED_URL_SECONDS)
    : DEFAULT_SIGNED_URL_SECONDS;

  const results = new Map<string, SignedUrlResult>();
  const checks = await Promise.all(paths.map(async (path) => {
    try {
      // Existing path from the database: validated as it is, never rewritten
      await validateStoragePath(path, 'read', context);
      return true;
    } catch (error) {
      if (!(error instanceof StoragePathError)) throw error;
      results.set(path, { path, url: null, error: STORAGE_ACCESS_DENIED_MESSAGE });
      return false;
    }
  }));
  const allowed = paths.filter((_, i) => checks[i]);

  if (allowed.length > 0) {
    const { data, error } = await context.supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(allowed, expiresIn, options.download ? { download: options.download } : undefined);
    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
    for (const entry of data ?? []) {
      const path = entry.path ?? '';
      results.set(path, { path, url: entry.signedUrl ?? null, ...(entry.error ? { error: entry.error } : {}) });
    }
  }

  return paths.map((path) => results.get(path) ?? { path, url: null, error: 'Datei nicht gefunden' });
}

/**
 * Renames a file in the same directory
 */
export async function renameFile(filePath: string, newName: string, ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  await validateWritablePath(filePath, context);

  const { directory } = splitPath(filePath);
  // Validates newName as a single segment (no traversal, no separator) before it reaches moveFile
  const newPath = childPath(directory, newName);

  await moveFileInContext(filePath, newPath, context);
}

/**
 * Creates a placeholder file for empty folders
 */
export async function createPlaceholder(path: string, ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  // A new folder name is created here: normalise once, validate the folder, then upload the placeholder below it
  const folderPath = pathUtils.sanitizePath(path);
  await validateWritablePath(folderPath, context);

  await uploadFromServer(context, `${folderPath}/.keep`, new Blob(['']), 'text/plain');
}

/** Rows per request: PostgREST caps a response at 1000 rows by default, so larger result sets are paged */
const ARCHIVE_PAGE_SIZE = 1000;

/**
 * Lists archived files the user may see: the archive of every accessible house (shared zone)
 * and the own private archive. Only archive entries are returned, `.keep` placeholders are skipped.
 *
 * Two queries run in parallel (shared: one LIKE with a house wildcard instead of one query per house,
 * private: own archive). The house scope is applied afterwards on the parsed path, because `%` and `_`
 * are LIKE wildcards and the pattern alone would also match foreign paths. Each query is paged.
 */
export async function listArchivedFiles(ctx?: StorageContext): Promise<StorageObject[]> {
  // The user is the signed-in one (access context), never passed in by the caller
  const context = ctx ?? await getStorageContext();
  const supabase = context.supabase;

  const fetchAllRows = async (likePattern: string) => {
    const rows: any[] = [];
    for (let from = 0; ; from += ARCHIVE_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('Dokumente_Metadaten')
        .select('*')
        .like('dateipfad', likePattern)
        .order('id', { ascending: true })
        .range(from, from + ARCHIVE_PAGE_SIZE - 1);
      if (error) {
        throw new Error(`Archiv konnte nicht geladen werden: ${error.message}`);
      }
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < ARCHIVE_PAGE_SIZE) break;
    }
    return rows;
  };

  const [sharedRows, privateRows] = await Promise.all([
    fetchAllRows(`${escapeLikePattern(sharedRoot(context.orgId))}/%/${escapeLikePattern(ARCHIVE_SEGMENT)}/%`),
    fetchAllRows(`${escapeLikePattern(privateRoot(context.orgId, context.userId))}/${escapeLikePattern(ARCHIVE_SEGMENT)}/%`),
  ]);

  const accessibleHouses = context.accessibleHouseIds === null ? null : new Set(context.accessibleHouseIds);
  const isVisible = (dateipfad: string): boolean => {
    try {
      const parsed = parseStoragePath(dateipfad);
      if (parsed.orgId !== context.orgId || parsed.rest[0] !== ARCHIVE_SEGMENT) return false;
      if (parsed.zone === 'private') return parsed.userId === context.userId;
      if (parsed.zone === 'shared' && parsed.houseId !== undefined) {
        return accessibleHouses === null || accessibleHouses.has(parsed.houseId);
      }
      return false;
    } catch {
      return false;
    }
  };

  return [...sharedRows, ...privateRows]
    .filter((item) => item.dateiname !== '.keep' && isVisible(item.dateipfad))
    .map((item) => toStorageObject(item, { path: `${item.dateipfad}/${item.dateiname}` }));
}

/**
 * Restores an archived file to its original location (or to targetPath).
 * Both paths are validated against the zone rules before the move.
 */
export async function restoreFile(archivePath: string, targetPath?: string, ctx?: StorageContext): Promise<void> {
  const parsed = parseArchivePath(archivePath);
  if (!parsed) {
    throw new Error('File is not in archive');
  }
  const context = ctx ?? await getStorageContext();
  await validateStoragePath(archivePath, 'write', context);

  const restorePath = targetPath ?? parsed.originalPath;
  await validateStoragePath(restorePath, 'write', context);

  await moveFileInContext(archivePath, restorePath, context);
}

/**
 * Archives multiple files (bulk operation)
 */
export async function bulkArchiveFiles(paths: string[], ctx?: StorageContext): Promise<string[]> {
  if (paths.length === 0) return [];
  return bulkArchiveFilesInContext(paths, ctx ?? await getStorageContext());
}

async function bulkArchiveFilesInContext(paths: string[], ctx: StorageContext): Promise<string[]> {
  const archivedPaths: string[] = [];

  for (const path of paths) {
    try {
      const archivePath = await archiveFileInContext(path, ctx);
      archivedPaths.push(archivePath);
    } catch (error) {
      console.error('Failed to archive file %s:', path, error);
      // Continue with other files even if one fails
    }
  }

  return archivedPaths;
}

/**
 * Moves a folder and all its contents to a new location
 */
export async function moveFolder(oldFolderPath: string, newFolderPath: string, ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  await Promise.all([oldFolderPath, newFolderPath].map((path) => validateWritablePath(path, context, { notFolderRoot: true })));

  // Both paths are validated above (no leading/trailing or double slashes), they are used as they are
  const cleanOldPath = oldFolderPath;
  const cleanNewPath = newFolderPath;

  // Get all files in the source folder recursively
  const allFiles = await getAllFilesInFolder(context, cleanOldPath);

  if (allFiles.length === 0) {
    // Create target folder with .keep file
    await uploadFromServer(context, `${cleanNewPath}/.keep`, new Blob(['']), 'text/plain');

    // Remove source .keep file if it exists
    try {
      await context.supabase.storage.from(STORAGE_BUCKET).remove([`${cleanOldPath}/.keep`]);
    } catch (removeError) {
      console.warn('Could not remove source .keep file:', removeError);
    }
    return;
  }

  // Move all files
  let movedCount = 0;
  let errorCount = 0;

  for (const file of allFiles) {
    try {
      // Calculate relative path within the folder
      const relativePath = file.path.substring(cleanOldPath.length + 1);
      await moveFileInContext(file.path, `${cleanNewPath}/${relativePath}`, context);
      movedCount++;

      // Small delay to avoid overwhelming the server
      if (movedCount % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Failed to move file %s:', file.name, error);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    throw new Error(`Folder move partially failed: ${errorCount} files could not be moved`);
  }

  // Clean up empty source folder structure
  await cleanupEmptyFolders(context, cleanOldPath);
}

/**
 * Recursively gets all files in a folder using database query
 */
async function getAllFilesInFolder(ctx: StorageContext, folderPath: string): Promise<Array<{ name: string, path: string }>> {
  // Query database for the files of exactly this folder and its sub-folders (no sibling with the same
  // prefix, no LIKE wildcards from the name): moveFolder derives the relative path from the folder prefix
  const { data: rows, error } = await ctx.supabase
    .from('Dokumente_Metadaten')
    .select('dateipfad, dateiname')
    .or(folderMetadataFilter(folderPath));

  if (error) {
    // Not "empty": the caller would report a successful move of a folder whose files stay behind
    console.error('Could not scan folder %s from DB:', folderPath, error);
    throw new Error(`Could not scan folder: ${error.message}`);
  }

  if (!rows) return [];

  // PostgREST turns a literal `*` of a LIKE value into a wildcard: the exact check is repeated on the rows
  return rows
    .filter(file => isPathInFolder(file.dateipfad, folderPath))
    .map(file => ({
      name: file.dateiname,
      path: `${file.dateipfad}/${file.dateiname}`
    }));
}

/**
 * Cleans up empty folders after moving files
 */
async function cleanupEmptyFolders(ctx: StorageContext, folderPath: string): Promise<void> {
  try {
    // Remove any remaining .keep files using DB
    const { data: keepFilesData } = await ctx.supabase
      .from('Dokumente_Metadaten')
      .select('dateiname')
      .eq('dateipfad', folderPath)
      .eq('dateiname', '.keep');

    if (keepFilesData && keepFilesData.length > 0) {
      await ctx.supabase.storage
        .from(STORAGE_BUCKET)
        .remove([`${folderPath}/.keep`]);

      // Also remove from DB
      await ctx.supabase
        .from('Dokumente_Metadaten')
        .delete()
        .eq('dateipfad', folderPath)
        .eq('dateiname', '.keep');
    }
  } catch (error) {
    console.warn('Could not cleanup empty folders:', error);
  }
}

/**
 * Archives all files in a folder (for folder deletion)
 */
export async function archiveFolder(folderPath: string, ctx?: StorageContext): Promise<string[]> {
  const context = ctx ?? await getStorageContext();
  await validateStoragePath(folderPath, 'write', context);

  // List all files in the folder
  const files = await listFilesInContext(folderPath, undefined, context);
  const filePaths = files
    .filter(file => !isKeepFile(file.name))
    .map(file => `${folderPath}/${file.name}`);

  return await bulkArchiveFilesInContext(filePaths, context);
}

/** Cheap reachability check of the bucket for the active organisation (health check of the performance dashboard) */
export async function pingStorage(ctx?: StorageContext): Promise<void> {
  const context = ctx ?? await getStorageContext();
  const { error } = await context.supabase.storage.from(STORAGE_BUCKET).list(orgRoot(context.orgId), { limit: 1 });
  if (error) {
    throw new Error(error.message);
  }
}
