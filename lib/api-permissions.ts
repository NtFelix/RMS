import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from '@/lib/object-scope';
import { checkPermission } from '@/lib/permissions';
import type { Modul, Aktion } from '@/lib/permissions';
import { PermissionCheckError } from '@/lib/permissions-core';

/**
 * Applies the house_id scope filter to a query if access is restricted.
 */
export async function applyScopeFilter<T>(
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
export async function applyWohnungScopeFilter<T>(
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
 * Throws an error if not allowed: `Error('Permission denied')` for a missing right, PermissionCheckError (same message)
 * if the check itself failed. Access is denied in both cases; the class only lets a route answer 503 instead of 403
 * (see apiPermissionErrorResponse in lib/api-permission-response.ts).
 */
export async function requireApiPermission(modul: Modul, aktion: Aktion): Promise<void> {
  const result = await checkPermission(modul, aktion);
  if (result === 'error') {
    throw new PermissionCheckError();
  }
  if (result !== 'allowed') {
    throw new Error('Permission denied');
  }
}

/**
 * Like requireApiPermission, but for a right that only decides WHAT a route delivers (e.g. tenant data inside an
 * apartment answer), not WHETHER it answers: `true` = granted, `false` = the right is missing. If the check itself
 * failed it throws PermissionCheckError (answer 503, see apiPermissionErrorResponse) instead of returning `false`,
 * so a failed lookup is never shown as "no access".
 */
export async function hasApiPermission(modul: Modul, aktion: Aktion): Promise<boolean> {
  const result = await checkPermission(modul, aktion);
  if (result === 'error') {
    throw new PermissionCheckError();
  }
  return result === 'allowed';
}
