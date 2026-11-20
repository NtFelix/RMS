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
 * How one day (or Rechentag) of an apartment was split among the tenants present (GH-17, contract area):
 * - `gleich`: equal split, nobody present has a contract area (the rule before contract areas).
 * - `flaeche`: everybody present has an area, the areas fill the apartment (or exceed it and are reduced to 100 %).
 * - `flaeche_leerstand`: everybody present has an area, but together less than the apartment; the rest is vacancy (landlord).
 * - `gleich_flaeche_fehlt`: some present tenants have an area, others not, and the apartment does not distribute the remaining
 *   area (`Wohnungen.restflaeche_verteilen` off): equal split, the areas have no effect on this day.
 * - `gleich_wohnungsgroesse_fehlt`: areas are entered, but the apartment size is unknown: equal split.
 * - `restflaeche`: some with and some without area, remaining area option on: the tenants with area bear their area, the rest of
 *   the apartment goes in equal parts to the tenants without area.
 * - `gleich_restflaeche_aufgebraucht`: as `restflaeche`, but the areas already fill the apartment, nothing is left for the tenants
 *   without area: equal split.
 */
export type WgTagesArt =
  | "gleich"
  | "flaeche"
  | "flaeche_leerstand"
  | "gleich_flaeche_fehlt"
  | "gleich_wohnungsgroesse_fehlt"
  | "restflaeche"
  | "gleich_restflaeche_aufgebraucht";

/** Days (or Rechentage) per kind of split of one apartment in the billing period. Kinds that did not occur are missing. */
export type WgVerteilungJeWohnung = Partial<Record<WgTagesArt, number>>;

/**
 * Shares of one day (or Rechentag) of an apartment among its tenants present on that day (GH-17, contract area).
 *
 * - All present tenants have a contract area (`vertragsflaeche`, incl. their share of common areas) and the apartment size is
 *   known: each bears `vertragsflaeche / max(apartment size, sum of the present contract areas)`. A tenant never bears more
 *   than its own area; a room without tenant stays vacancy (landlord), and contract areas that together exceed the apartment
 *   are reduced so that at most 100 % are distributed.
 * - Some present tenants have an area, others not, and the apartment distributes the remaining area (`restflaecheVerteilen`):
 *   the tenants with area bear `area / max(apartment size, sum of their areas)` as above, the remaining share
 *   `1 - sum / max(...)` is split equally among the tenants without area. Nothing left (sum >= apartment size): equal split.
 * - Otherwise (no or partial areas without the option, apartment size unknown): the day is split equally, as before.
 * The shares of a day always add up to at most 1.
 */
function tagesAnteile(
  anwesend: { flaeche: number | null }[],
  wohnungsgroesse: number,
  restflaecheVerteilen: boolean
): { anteile: number[]; art: WgTagesArt } {
  const gleich = () => anwesend.map(() => 1 / anwesend.length);
  const anzahlMitFlaeche = anwesend.filter(r => r.flaeche !== null).length;
  if (anzahlMitFlaeche === 0) return { anteile: gleich(), art: "gleich" };
  if (!(wohnungsgroesse > 0)) return { anteile: gleich(), art: "gleich_wohnungsgroesse_fehlt" };
  const summe = anwesend.reduce((acc, r) => acc + (r.flaeche ?? 0), 0);
  const basis = Math.max(wohnungsgroesse, summe);
  if (anzahlMitFlaeche === anwesend.length) {
    return { anteile: anwesend.map(r => (r.flaeche as number) / basis), art: summe < wohnungsgroesse ? "flaeche_leerstand" : "flaeche" };
  }
  if (!restflaecheVerteilen) return { anteile: gleich(), art: "gleich_flaeche_fehlt" };
  if (summe >= wohnungsgroesse) return { anteile: gleich(), art: "gleich_restflaeche_aufgebraucht" };
  // summe < wohnungsgroesse, so basis = wohnungsgroesse and the rest is positive
  const restJeVertrag = (wohnungsgroesse - summe) / wohnungsgroesse / (anwesend.length - anzahlMitFlaeche);
  return { anteile: anwesend.map(r => (r.flaeche === null ? restJeVertrag : r.flaeche / wohnungsgroesse)), art: "restflaeche" };
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

/** Remaining area option of the apartment of a group (`Wohnungen.restflaeche_verteilen`, set by the Abrechnung loader). */
function restflaecheVerteilenVon(group: Mieter[]): boolean {
  return group.some(t => t.Wohnungen?.restflaeche_verteilen === true);
}

/** Result of the split of all apartments: factor per tenant and, per apartment key, how its days were split. */
export interface WgVerteilung {
  faktoren: Record<string, number>;
  /** Key: `wohnung_id` of the apartment (or the tenant ID for a tenant without apartment), as in `groupTenantsByApartment`. */
  tageJeWohnung: Record<string, WgVerteilungJeWohnung>;
}

// Compute the WG factor for each tenant: the fraction of an apartment's share that should be borne by the tenant.
// Each day is split among the roommates present, equally or by contract area (see tagesAnteile).
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
  return analysiereWgVerteilung(tenants, from, to, rechenbasis).faktoren;
}

/**
 * The split of computeWgFactorsByTenant plus, per apartment, how many days were split in which way (see `WgTagesArt`), so the
 * Abrechnung can explain why contract areas had no effect or where the remaining area went.
 */
export function analysiereWgVerteilung(tenants: Mieter[], from: string, to: string, rechenbasis?: Rechenbasis): WgVerteilung {
  if (isRechenbasis360({ rechenbasis })) {
    return analysiereWgVerteilung360(tenants, from, to);
  }

  const faktoren: Record<string, number> = {};
  const tageJeWohnung: Record<string, WgVerteilungJeWohnung> = {};

  // parseAsUtc yields UTC calendar days, so DST and time-of-day components never shift a day
  const periodStart = parseAsUtc(from).getTime();
  const periodEnd = parseAsUtc(to).getTime();
  const totalDays = calculateTotalDays(from, to);

  for (const [key, group] of groupTenantsByApartment(tenants)) {
    const wohnungsgroesse = wohnungsgroesseVon(group);
    const restflaecheVerteilen = restflaecheVerteilenVon(group);
    const tage: WgVerteilungJeWohnung = {};
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
      const { anteile, art } = tagesAnteile(active, wohnungsgroesse, restflaecheVerteilen);
      active.forEach((r, i) => { r.share += anteile[i]; });
      tage[art] = (tage[art] ?? 0) + 1;
    }

    // Normalize by total days to get the factor (0-1 range)
    for (const r of ranges) {
      faktoren[r.id] = totalDays > 0 ? r.share / totalDays : 0;
    }
    tageJeWohnung[key] = tage;
  }

  return { faktoren, tageJeWohnung };
}

/**
 * analysiereWgVerteilung on the 360-day basis: per apartment, iterate over the Rechentage
 * positions of the period instead of calendar days, splitting each Rechentag (see tagesAnteile) among the
 * tenants whose (rounded, period-clipped) Rechentage range contains it. Since a tenant's range
 * comes from calculateTenantRechentage, an apartment always hands out exactly its Rechentage
 * (30 per whole month) across its tenants plus vacancy, matching the calendar branch's day split.
 */
function analysiereWgVerteilung360(tenants: Mieter[], startdatum: string, enddatum: string): WgVerteilung {
  const wgFactors: Record<string, number> = {};
  const tageJeWohnung: Record<string, WgVerteilungJeWohnung> = {};
  const period = getRechentagePeriod(startdatum, enddatum);
  if (!period || period.totalRechentage <= 0) {
    for (const t of tenants) wgFactors[t.id] = 0;
    return { faktoren: wgFactors, tageJeWohnung };
  }

  for (const [key, group] of groupTenantsByApartment(tenants)) {
    const wohnungsgroesse = wohnungsgroesseVon(group);
    const restflaecheVerteilen = restflaecheVerteilenVon(group);
    const tage: WgVerteilungJeWohnung = {};
    const ranges = group.map(t => {
      const r = calculateTenantRechentage(t, startdatum, enddatum);
      return { id: t.id, start: r.start, end: r.end, flaeche: vertragsflaecheVon(t), share: 0 };
    });

    for (let position = period.start; position < period.end; position++) {
      const active = ranges.filter(r => r.start !== undefined && r.end !== undefined && position >= r.start! && position < r.end!);
      if (active.length === 0) continue;
      const { anteile, art } = tagesAnteile(active, wohnungsgroesse, restflaecheVerteilen);
      active.forEach((r, i) => { r.share += anteile[i]; });
      tage[art] = (tage[art] ?? 0) + 1;
    }

    for (const r of ranges) {
      wgFactors[r.id] = r.share / period.totalRechentage;
    }
    tageJeWohnung[key] = tage;
  }

  return { faktoren: wgFactors, tageJeWohnung };
}

const DAY_MS = 1000 * 3600 * 24;
