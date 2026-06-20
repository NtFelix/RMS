import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';
import { hasPermission } from '@/lib/permissions';
import type { Modul, Aktion } from '@/lib/permissions';

/**
 * Applies the house_id scope filter to a query if access is restricted.
 */
export async function applyScopeFilter<T extends any>(
  query: T,
  column: string = 'haus_id'
): Promise<T> {
  const accessibleIds = await getAccessibleHaeuserIds();
  if (accessibleIds !== null) {
    return (query as any).in(column, accessibleIds);
  }
  return query;
}

/**
 * Applies the wohnung_id scope filter to a query if access is restricted.
 */
export async function applyWohnungScopeFilter<T extends any>(
  query: T,
  column: string = 'wohnung_id'
): Promise<T> {
  const accessibleWohnungIds = await getAccessibleWohnungIds();
  if (accessibleWohnungIds !== null) {
    return (query as any).in(column, accessibleWohnungIds);
  }
  return query;
}

/**
 * Verifies if a specific house ID is within the user's accessible houses.
 */
export async function verifyEntityInScope(hausId: string): Promise<boolean> {
  const accessibleIds = await getAccessibleHaeuserIds();
  if (accessibleIds === null) return true; // unrestricted
  return accessibleIds.includes(hausId);
}

/**
 * Verifies if a specific apartment ID is within the user's accessible apartments.
 */
export async function verifyWohnungInScope(wohnungId: string): Promise<boolean> {
  const accessibleWohnungIds = await getAccessibleWohnungIds();
  if (accessibleWohnungIds === null) return true; // unrestricted
  return accessibleWohnungIds.includes(wohnungId);
}

/**
 * Requires the user to have the given module/action permission.
 * Throws an error if not allowed.
 */
export async function requireApiPermission(modul: Modul, aktion: Aktion): Promise<void> {
  const allowed = await hasPermission(modul, aktion);
  if (!allowed) {
    throw new Error('Permission denied');
  }
}
