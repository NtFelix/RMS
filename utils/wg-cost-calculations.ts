import type { Mieter } from "@/lib/types";
import { parseAsUtc, calculateTotalDays } from "./date-calculations";
import { isRechenbasis360, getRechentagePeriod, calculateTenantRechentage, type Rechenbasis } from "./rechentage";

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

/**
 * Shares of one day (or Rechentag) of an apartment among its tenants present on that day (GH-17, contract area).
 *
 * - All present tenants have a contract area (`vertragsflaeche`, incl. their share of common areas) and the apartment size is
 *   known: each bears `vertragsflaeche / max(apartment size, sum of the present contract areas)`. A tenant never bears more
 *   than its own area; a room without tenant stays vacancy (landlord), and contract areas that together exceed the apartment
 *   are reduced so that at most 100 % are distributed.
 * - Otherwise (no or partial areas, apartment size unknown): the day is split equally among the present tenants, as before.
 */
function tagesAnteile(anwesend: { flaeche: number | null }[], wohnungsgroesse: number): number[] {
  const alleMitFlaeche = anwesend.every(r => r.flaeche !== null && r.flaeche > 0);
  if (!alleMitFlaeche || !(wohnungsgroesse > 0)) return anwesend.map(() => 1 / anwesend.length);
  const summe = anwesend.reduce((acc, r) => acc + (r.flaeche as number), 0);
  const basis = Math.max(wohnungsgroesse, summe);
  return anwesend.map(r => (r.flaeche as number) / basis);
}

/** Contract area of a tenant as a usable number, `null` if missing or not positive. */
function vertragsflaecheVon(tenant: Mieter): number | null {
  const wert = Number(tenant.vertragsflaeche);
  return tenant.vertragsflaeche !== null && tenant.vertragsflaeche !== undefined && Number.isFinite(wert) && wert > 0 ? wert : null;
}

/** Size of the apartment of a group of tenants (all share one apartment), 0 if unknown. */
function wohnungsgroesseVon(group: Mieter[]): number {
  const wert = Number(group.find(t => t.Wohnungen?.groesse)?.Wohnungen?.groesse);
  return Number.isFinite(wert) && wert > 0 ? wert : 0;
}

// Compute the WG factor for each tenant: the fraction of an apartment's share that should be borne by the tenant.
// Each day is split among the roommates present, equally or, when all of them have a contract area, by area (see tagesAnteile).
// The factors per apartment sum to at most 1; the rest (days without occupants, rooms without tenant) is vacancy.
export function computeWgFactorsByTenant(tenants: Mieter[], year: number): Record<string, number>;
export function computeWgFactorsByTenant(tenants: Mieter[], startdatum: string, enddatum: string, rechenbasis?: Rechenbasis): Record<string, number>;
export function computeWgFactorsByTenant(tenants: Mieter[], yearOrStartdatum: number | string, enddatum?: string, rechenbasis?: Rechenbasis): Record<string, number> {
  // Handle both year-based (backward compatibility) and date-range based calls
  if (typeof yearOrStartdatum !== 'number' && !enddatum) {
    throw new Error('End date is required when using date range');
  }
  const [from, to] = typeof yearOrStartdatum === 'number'
    ? [`${yearOrStartdatum}-01-01`, `${yearOrStartdatum}-12-31`]
    : [yearOrStartdatum, enddatum!];

  if (isRechenbasis360({ rechenbasis })) {
    return computeWgFactorsByTenant360(tenants, from, to);
  }

  const wgFactors: Record<string, number> = {};

  // parseAsUtc yields UTC calendar days, so DST and time-of-day components never shift a day
  const periodStart = parseAsUtc(from).getTime();
  const periodEnd = parseAsUtc(to).getTime();
  const totalDays = calculateTotalDays(from, to);

  for (const group of groupTenantsByApartment(tenants).values()) {
    const wohnungsgroesse = wohnungsgroesseVon(group);
    const ranges = group.map(t => ({
      id: t.id,
      // No move-in date means no occupancy, as in calculateTenantOccupancy
      start: t.einzug ? parseAsUtc(t.einzug).getTime() : Infinity,
      end: t.auszug ? parseAsUtc(t.auszug).getTime() : periodEnd,
      flaeche: vertragsflaecheVon(t),
      share: 0
    }));

    // For each day in the period, split the day among the active roommates (equally or by contract area)
    for (let day = 0; day < totalDays; day++) {
      const time = periodStart + day * DAY_MS;
      const active = ranges.filter(r => time >= r.start && time <= r.end);
      if (active.length === 0) continue;
      const anteile = tagesAnteile(active, wohnungsgroesse);
      active.forEach((r, i) => { r.share += anteile[i]; });
    }

    // Normalize by total days to get the factor (0-1 range)
    for (const r of ranges) {
      wgFactors[r.id] = totalDays > 0 ? r.share / totalDays : 0;
    }
  }

  return wgFactors;
}

/**
 * computeWgFactorsByTenant on the 360-day basis: per apartment, iterate over the Rechentage
 * positions of the period instead of calendar days, splitting each Rechentag equally among the
 * tenants whose (rounded, period-clipped) Rechentage range contains it. Since a tenant's range
 * comes from calculateTenantRechentage, an apartment always hands out exactly its Rechentage
 * (30 per whole month) across its tenants plus vacancy, matching the calendar branch's day split.
 */
function computeWgFactorsByTenant360(tenants: Mieter[], startdatum: string, enddatum: string): Record<string, number> {
  const wgFactors: Record<string, number> = {};
  const period = getRechentagePeriod(startdatum, enddatum);
  if (!period || period.totalRechentage <= 0) {
    for (const t of tenants) wgFactors[t.id] = 0;
    return wgFactors;
  }

  for (const group of groupTenantsByApartment(tenants).values()) {
    const wohnungsgroesse = wohnungsgroesseVon(group);
    const ranges = group.map(t => {
      const r = calculateTenantRechentage(t, startdatum, enddatum);
      return { id: t.id, start: r.start, end: r.end, flaeche: vertragsflaecheVon(t), share: 0 };
    });

    for (let position = period.start; position < period.end; position++) {
      const active = ranges.filter(r => r.start !== undefined && r.end !== undefined && position >= r.start! && position < r.end!);
      if (active.length === 0) continue;
      const anteile = tagesAnteile(active, wohnungsgroesse);
      active.forEach((r, i) => { r.share += anteile[i]; });
    }

    for (const r of ranges) {
      wgFactors[r.id] = r.share / period.totalRechentage;
    }
  }

  return wgFactors;
}

const DAY_MS = 1000 * 3600 * 24;
