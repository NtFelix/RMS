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
  options: { delayMs?: number; signal?: AbortSignal } = {}
): Promise<TenantViewAccess> {
  const { delayMs = TENANT_CHECK_RETRY_DELAY_MS, signal } = options;

  let result = await checkPermission('mieter', 'ansehen');
  if (result === 'error') {
    // A caller that no longer needs the answer (it returned without tenant data) aborts: no pause, no second check.
    // The answer then stays "failed" (fail-closed), so an abort can never turn into `allowed`.
    if (!(await pauseUnlessAborted(delayMs, signal))) {
      result = await checkPermission('mieter', 'ansehen');
    }
  }

  if (result === 'allowed') return { canViewTenants: true };
  return { canViewTenants: false, permissionCheckFailed: result === 'error' };
}

/** Waits `ms`; resolves `true` at once if `signal` is (or gets) aborted, `false` after the full pause. */
function pauseUnlessAborted(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(true);
  return new Promise<boolean>(resolve => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(false);
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type WithheldTenantFields = { tenantAccess: false; permissionCheckFailed?: true };

/**
 * Fields of an apartment row whose tenant is withheld: `tenantAccess: false` ("no access", not "no tenant") and, only
 * if the check FAILED (not for a missing right), `permissionCheckFailed: true`. Shared by the page and the route so the
 * signal is built in one place.
 */
export function withheldTenantFields(access: TenantViewAccess): WithheldTenantFields {
  return !access.canViewTenants && access.permissionCheckFailed
    ? { tenantAccess: false, permissionCheckFailed: true }
    : { tenantAccess: false };
}

/**
 * Tenant part of an answer that also contains other data: the tenants themselves with `mieter:ansehen`, otherwise an
 * empty list plus `withheldTenantFields`. One place for the gate, so no caller can build the withholding differently.
 */
export function applyTenantAccess<T>(
  access: TenantViewAccess,
  mieter: T[]
): { mieter: T[] } & Partial<WithheldTenantFields> {
  return access.canViewTenants ? { mieter } : { mieter: [], ...withheldTenantFields(access) };
}
