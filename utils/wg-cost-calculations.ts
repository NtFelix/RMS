import { Mieter } from "@/lib/data-fetching";

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

// Compute the WG factor for each tenant: the fraction of an apartment's yearly share
// that should be borne by the tenant, splitting each active month equally among active roommates.
// The factors per apartment sum to ~1 across roommates, considering months with no occupants are ignored.
export function computeWgFactorsByTenant(tenants: Mieter[], year: number): Record<string, number> {
  const wgFactors: Record<string, number> = {};

  // Group tenants by apartment (fallback to tenant.id if wohnung_id is null)
  const groups = new Map<string, Mieter[]>();
  for (const t of tenants) {
    const key = t.wohnung_id || t.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  for (const [_aptId, group] of groups) {
    const monthlyShares: Record<string, number> = {};
    for (const t of group) monthlyShares[t.id] = 0;

    for (let m = 0; m < 12; m++) {
      const active = group.filter((t) => isTenantActiveInMonth(t, year, m));
      const count = active.length;
      if (count === 0) continue;
      const shareEach = 1 / count;
      for (const t of active) {
        monthlyShares[t.id] += shareEach; // accumulate per month
      }
    }

    // Normalize by 12 months (30/360 convention aligns with monthly weighting)
    for (const t of group) {
      wgFactors[t.id] = (monthlyShares[t.id] || 0) / 12;
    }
  }

  return wgFactors;
}
