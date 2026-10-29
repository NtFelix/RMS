import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { assertPathAllowed, isOwnLegacyPath, StoragePathError } from '@/lib/storage-paths'

/**
 * Active organisation of the current user (verified server-side via the RPC).
 * Returns null if there is none.
 */
export async function getActiveOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data: orgId, error } = await supabase.rpc('current_organisation_id')
  if (error || !orgId) return null
  return orgId as string
}

/**
 * Server-side access check for storage paths in API routes.
 * Uses the active organisation (current_organisation_id RPC) and the house scope
 * (getAccessibleHaeuserIds). Fails closed.
 *
 * Returns an error message for the client, or null if access is allowed.
 */
export async function checkStoragePathAccess(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  options: { allowLegacyOwnRead?: boolean } = {},
): Promise<string | null> {
  // TRANSITION (GH-27 PR 2 -> PR 3): read-only access to the own legacy user_ path until the
  // backfill has moved it. Only for read/download routes, never for writes. TODO(GH-27 PR3): remove.
  if (options.allowLegacyOwnRead && isOwnLegacyPath(path, userId)) {
    return null
  }

  const orgId = await getActiveOrgId(supabase)
  if (!orgId) {
    return 'Keine aktive Organisation'
  }

  try {
    assertPathAllowed(path, {
      orgId,
      userId,
      accessibleHouseIds: await getAccessibleHaeuserIds(),
    })
    return null
  } catch (error) {
    if (error instanceof StoragePathError) {
      return error.code === 'LEGACY_PATH'
        ? 'Dieser Speicherpfad ist veraltet und nicht mehr verfügbar'
        : 'Invalid path'
    }
    throw error
  }
}
