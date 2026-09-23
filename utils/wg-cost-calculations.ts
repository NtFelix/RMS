import type { Mieter } from "@/lib/types";
import { parseAsUtc } from "./date-calculations";

// Get all occupants of an apartment by its ID
export function getApartmentOccupants(tenants: Mieter[], apartmentId: string | null): Mieter[] {
  if (!apartmentId) return [];
  return tenants.filter(tenant => tenant.wohnung_id === apartmentId);
}

// Determine if a tenant is active in the given month of the year (UTC based)
export function isTenantActiveInMonth(tenant: Mieter, year: number, monthIndex: number): boolean {
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  const einzugDate = tenant.einzug ? new Date(tenant.einzug) : null;
  const auszugDateRaw = tenant.auszug ? new Date(tenant.auszug) : null;
  const auszugDate = auszugDateRaw && !isNaN(auszugDateRaw.getTime()) ? auszugDateRaw : null;

  if (!einzugDate || isNaN(einzugDate.getTime())) return false;

  return (
    einzugDate <= monthEnd &&
    (!auszugDate || auszugDate >= monthStart)
  );
}

// Compute the WG factor for each tenant: the fraction of an apartment's share
// that should be borne by the tenant, splitting each active period equally among active roommates.
// The factors per apartment sum to ~1 across roommates, considering periods with no occupants are ignored.
export function computeWgFactorsByTenant(tenants: Mieter[], year: number): Record<string, number>;
export function computeWgFactorsByTenant(tenants: Mieter[], startdatum: string, enddatum: string): Record<string, number>;
export function computeWgFactorsByTenant(tenants: Mieter[], yearOrStartdatum: number | string, enddatum?: string): Record<string, number> {
  const wgFactors: Record<string, number> = {};

  // Handle both year-based (backward compatibility) and date-range based calls
  let startdatum: string;
  let enddatumStr: string;

  if (typeof yearOrStartdatum === 'number') {
    // Year-based call (backward compatibility)
    startdatum = `${yearOrStartdatum}-01-01`;
    enddatumStr = `${yearOrStartdatum}-12-31`;
  } else {
    // Date-range based call
    if (!enddatum) {
      throw new Error('End date is required when using date range');
    }
    startdatum = yearOrStartdatum;
    enddatumStr = enddatum;
  }

  // All dates are compared as UTC calendar days so DST and time-of-day components
  // (e.g. '2025-04-15T10:00:00Z') never shift a move-in/move-out onto another day.
  const periodStart = parseUtcDay(startdatum);
  const periodEnd = parseUtcDay(enddatumStr);
  const totalDays = Math.round((periodEnd - periodStart) / DAY_MS) + 1;

  // Group tenants by apartment (fallback to tenant.id if wohnung_id is null)
  const groups = new Map<string, Mieter[]>();
  for (const t of tenants) {
    const key = t.wohnung_id || t.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  for (const [_aptId, group] of groups) {
    const ranges = group.map(t => ({
      id: t.id,
      start: t.einzug ? parseUtcDay(t.einzug) : periodStart,
      end: t.auszug ? parseUtcDay(t.auszug) : periodEnd
    }));
    const tenantShares: Record<string, number> = {};
    for (const r of ranges) tenantShares[r.id] = 0;

    // For each day in the period, split the day equally among the active roommates
    for (let day = 0; day < totalDays; day++) {
      const time = periodStart + day * DAY_MS;

      let count = 0;
      for (const r of ranges) if (time >= r.start && time <= r.end) count++;
      if (count === 0) continue;

      const shareEach = 1 / count;
      for (const r of ranges) if (time >= r.start && time <= r.end) tenantShares[r.id] += shareEach;
    }

    // Normalize by total days to get the factor (0-1 range)
    for (const t of group) {
      wgFactors[t.id] = totalDays > 0 ? (tenantShares[t.id] || 0) / totalDays : 0;
    }
  }

  return wgFactors;
}

const DAY_MS = 1000 * 3600 * 24;

// Parse an ISO/German date (ignoring any time component) as a UTC midnight timestamp.
function parseUtcDay(value: string): number {
  return parseAsUtc(value.split('T')[0]).getTime();
}
