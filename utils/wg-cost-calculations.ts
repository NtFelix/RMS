import type { Mieter } from "@/lib/types";
import { parseAsUtc, calculateTotalDays } from "./date-calculations";

// Get all occupants of an apartment by its ID
export function getApartmentOccupants(tenants: Mieter[], apartmentId: string | null): Mieter[] {
  if (!apartmentId) return [];
  return tenants.filter(tenant => tenant.wohnung_id === apartmentId);
}

// Group tenants by apartment (fallback to tenant.id if wohnung_id is null)
export function groupTenantsByApartment(tenants: Mieter[]): Map<string, Mieter[]> {
  const groups = new Map<string, Mieter[]>();
  for (const t of tenants) {
    const key = t.wohnung_id || t.id;
    const group = groups.get(key);
    if (group) group.push(t);
    else groups.set(key, [t]);
  }
  return groups;
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
  if (typeof yearOrStartdatum !== 'number' && !enddatum) {
    throw new Error('End date is required when using date range');
  }
  const [from, to] = typeof yearOrStartdatum === 'number'
    ? [`${yearOrStartdatum}-01-01`, `${yearOrStartdatum}-12-31`]
    : [yearOrStartdatum, enddatum!];

  // parseAsUtc yields UTC calendar days, so DST and time-of-day components never shift a day
  const periodStart = parseAsUtc(from).getTime();
  const periodEnd = parseAsUtc(to).getTime();
  const totalDays = calculateTotalDays(from, to);

  for (const group of groupTenantsByApartment(tenants).values()) {
    const ranges = group.map(t => ({
      id: t.id,
      start: t.einzug ? parseAsUtc(t.einzug).getTime() : periodStart,
      end: t.auszug ? parseAsUtc(t.auszug).getTime() : periodEnd,
      share: 0
    }));

    // For each day in the period, split the day equally among the active roommates
    for (let day = 0; day < totalDays; day++) {
      const time = periodStart + day * DAY_MS;
      const isActive = (r: { start: number; end: number }) => time >= r.start && time <= r.end;

      let count = 0;
      for (const r of ranges) if (isActive(r)) count++;
      if (count === 0) continue;

      for (const r of ranges) if (isActive(r)) r.share += 1 / count;
    }

    // Normalize by total days to get the factor (0-1 range)
    for (const r of ranges) {
      wgFactors[r.id] = totalDays > 0 ? r.share / totalDays : 0;
    }
  }

  return wgFactors;
}

const DAY_MS = 1000 * 3600 * 24;
