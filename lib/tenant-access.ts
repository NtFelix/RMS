import { isTenantActive } from '@/utils/date-calculations';

/**
 * Text shown wherever a tenant would stand (at an apartment, in an overview, in the search) for a user without
 * `mieter:ansehen`. Not an error and not an empty value: an empty value would look like "no tenant".
 * The status frei / vermietet stays visible; only name and dates of the tenant are withheld (server-side, see the
 * routes that set `tenantAccess: false`).
 */
export const TENANT_NO_ACCESS_LABEL = 'Kein Zugriff';

/**
 * One tenant row per apartment: the one that is active today if there is one, otherwise the first row of that apartment.
 * Without a rule the first row would decide, and the Mieter query has no ORDER BY, so an apartment with a moved-out
 * and a current tenant could show as "frei" depending on row order.
 */
export function pickCurrentTenantPerApartment<T extends { wohnung_id: string | null; auszug: string | null }>(
  rows: readonly T[],
  todayStr: string,
): Map<string, T> {
  const byApartment = new Map<string, T>();
  for (const row of rows) {
    if (!row.wohnung_id) continue;
    const current = byApartment.get(row.wohnung_id);
    if (!current || (!isTenantActive(current.auszug, todayStr) && isTenantActive(row.auszug, todayStr))) {
      byApartment.set(row.wohnung_id, row);
    }
  }
  return byApartment;
}
