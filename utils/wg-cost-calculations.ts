import type { Mieter } from "@/lib/types";

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
  let startDate: Date;
  let endDate: Date;

  if (typeof yearOrStartdatum === 'number') {
    // Year-based call (backward compatibility)
    const year = yearOrStartdatum;
    startDate = new Date(year, 0, 1); // January 1st
    endDate = new Date(year, 11, 31); // December 31st
  } else {
    // Date-range based call
    if (!enddatum) {
      throw new Error('End date is required when using date range');
    }
    startDate = new Date(yearOrStartdatum);
    endDate = new Date(enddatum);
  }

  // Group tenants by apartment (fallback to tenant.id if wohnung_id is null)
  const groups = new Map<string, Mieter[]>();
  for (const t of tenants) {
    const key = t.wohnung_id || t.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  for (const [_aptId, group] of groups) {
    const tenantShares: Record<string, number> = {};
    for (const t of group) tenantShares[t.id] = 0;

    // Calculate total days in the billing period
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

    // For each day in the period, calculate who was active
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      const activeTenants = group.filter((t) => isTenantActiveOnDate(t, currentDate));
      const count = activeTenants.length;

      if (count === 0) continue;

      const shareEach = 1 / count;
      for (const t of activeTenants) {
        tenantShares[t.id] += shareEach;
      }
    }

    // Normalize by total days to get the factor (0-1 range)
    for (const t of group) {
      wgFactors[t.id] = totalDays > 0 ? (tenantShares[t.id] || 0) / totalDays : 0;
    }
  }

  return wgFactors;
}

function isTenantActiveOnDate(tenant: Mieter, date: Date): boolean {
  const einzugDate = tenant.einzug ? new Date(tenant.einzug) : new Date('1900-01-01');
  const auszugDate = tenant.auszug ? new Date(tenant.auszug) : new Date('9999-12-31'); // Far future date for active tenants

  return date >= einzugDate && date <= auszugDate;
}
