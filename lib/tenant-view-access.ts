import { checkPermission } from '@/lib/permissions';

/**
 * Pause before the single retry of the `mieter:ansehen` check. Short on purpose: a transient failure (a dropped
 * connection, a cold start) is usually gone after a moment, and the caller is waiting.
 */
export const TENANT_CHECK_RETRY_DELAY_MS = 200;

/**
 * Whether tenant data may be delivered with an answer that also contains apartment data.
 * - `canViewTenants: true`: `mieter:ansehen` is granted.
 * - `canViewTenants: false`, `permissionCheckFailed: false`: the right is missing (a decision).
 * - `canViewTenants: false`, `permissionCheckFailed: true`: the check failed twice, so there is NO decision. Tenant
 *   data stays withheld (fail-closed) exactly as for a missing right; the flag only lets the UI say that the hiding may
 *   be wrong and offer a reload.
 */
export type TenantViewAccess =
  | { canViewTenants: true }
  | { canViewTenants: false; permissionCheckFailed: boolean };

/**
 * Checks `mieter:ansehen` and repeats a failed check ONCE after a short pause. Only a result of `error` (the check
 * itself failed) is retried: `denied` is a decision and never repeated, `allowed` needs no second look. There is no
 * loop: the second `error` is final. Only the tenant check retries; `hasPermission` / `checkPermission` themselves
 * stay without a retry.
 *
 * Never returns `canViewTenants: true` unless a check answered exactly `allowed`.
 */
export async function checkTenantViewAccess(
  options: { delayMs?: number } = {}
): Promise<TenantViewAccess> {
  const { delayMs = TENANT_CHECK_RETRY_DELAY_MS } = options;

  let result = await checkPermission('mieter', 'ansehen');
  if (result === 'error') {
    await new Promise<void>(resolve => setTimeout(resolve, delayMs));
    result = await checkPermission('mieter', 'ansehen');
  }

  if (result === 'allowed') return { canViewTenants: true };
  return { canViewTenants: false, permissionCheckFailed: result === 'error' };
}
