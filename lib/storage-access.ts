import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { STORAGE_ACCESS_DENIED_MESSAGE } from '@/lib/storage-messages'
import {
  assertPathAllowed,
  childPath,
  isArchivePath,
  isOwnLegacyPath,
  parseStoragePath,
  StoragePathError,
  type PathAccessMode,
} from '@/lib/storage-paths'

/**
 * Active organisation of the current user (verified server-side via the RPC).
 * Returns null if there is none.
 */
export async function getActiveOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data: orgId, error } = await supabase.rpc('current_organisation_id')
  if (error || !orgId) return null
  return orgId as string
}

/** True if a house with this id is visible to the user (RLS: only houses of the active organisation). Fails closed. */
async function houseExists(supabase: SupabaseClient, houseId: string): Promise<boolean> {
  const { data, error } = await supabase.from('Haeuser').select('id').eq('id', houseId).maybeSingle()
  return !error && !!data
}

/**
 * Server-side access check for storage paths in API routes.
 * Uses the active organisation (current_organisation_id RPC) and the house scope
 * (getAccessibleHaeuserIds). Fails closed.
 *
 * mode 'read' (default) allows the browsable roots, mode 'write' only paths that can hold objects
 * and never `__archive__` (only archiveFile/restoreFile in the storage service write there). In write mode
 * the house of a `shared/{houseId}/...` path must exist in the active organisation (one lookup).
 *
 * Returns an error message for the client, or null if access is allowed.
 */
export async function checkStoragePathAccess(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  options: { allowLegacyOwnRead?: boolean; mode?: PathAccessMode } = {},
): Promise<string | null> {
  // TRANSITION (GH-27 PR 2 -> PR 3): read-only access to the own legacy user_ path until the
  // backfill has moved it. Only for read/download routes, never for writes. TODO(GH-27 PR3): remove.
  if (options.allowLegacyOwnRead && isOwnLegacyPath(path, userId)) {
    return null
  }

  const [orgId, accessibleHouseIds] = await Promise.all([getActiveOrgId(supabase), getAccessibleHaeuserIds()])
  if (!orgId) {
    return 'Keine aktive Organisation'
  }

  const mode = options.mode ?? 'read'
  try {
    assertPathAllowed(path, { orgId, userId, accessibleHouseIds }, mode)
    if (mode === 'write' && isArchivePath(path)) {
      return STORAGE_ACCESS_DENIED_MESSAGE
    }
    // A user without house restriction (accessibleHouseIds = null) passes the scope check for any house id:
    // writing must not create folders below an invented one. RLS limits Haeuser to the active organisation.
    if (mode === 'write') {
      const { zone, houseId } = parseStoragePath(path)
      if (zone === 'shared' && houseId !== undefined && !(await houseExists(supabase, houseId))) {
        return STORAGE_ACCESS_DENIED_MESSAGE
      }
    }
    return null
  } catch (error) {
    if (error instanceof StoragePathError) {
      return error.code === 'LEGACY_PATH'
        ? 'Dieser Speicherpfad ist veraltet und nicht mehr verfügbar'
        : STORAGE_ACCESS_DENIED_MESSAGE
    }
    throw error
  }
}

/**
 * Resolves `parentPath/name` and checks access on exactly that target path. Routes use the returned
 * path for the storage call and the metadata. An unsafe name gives status 400, a bad, foreign or
 * non-writable parent/target gives status 403 (as the plain path check did before).
 */
export async function resolveChildPath(
  supabase: SupabaseClient,
  userId: string,
  parentPath: string,
  name: string,
  options: { allowLegacyOwnRead?: boolean; mode?: PathAccessMode } = {},
): Promise<{ path: string } | { error: string; status: 400 | 403 }> {
  let target: string
  try {
    target = childPath(parentPath, name)
  } catch (error) {
    if (error instanceof StoragePathError) {
      return error.code === 'INVALID_NAME'
        ? { error: 'Invalid name', status: 400 }
        : { error: error.code === 'LEGACY_PATH' ? 'Dieser Speicherpfad ist veraltet und nicht mehr verfügbar' : STORAGE_ACCESS_DENIED_MESSAGE, status: 403 }
    }
    throw error
  }
  const accessError = await checkStoragePathAccess(supabase, userId, target, options)
  return accessError ? { error: accessError, status: 403 } : { path: target }
}
