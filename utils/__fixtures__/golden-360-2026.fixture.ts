/**
 * Golden billing case for the 360-day basis ("30/360", rechenbasis: '360_tage'): one fictional
 * house, one calendar-year Abrechnung (2026 — a valid 12-whole-month window, 360 Rechentage).
 *
 * Every name, id and address is invented. Expected Rechentage are derived BY HAND from the rules
 * in ../rechentage.ts (30 Rechentage per month, a move-in/-out rounded to the nearest Rechenpunkt:
 * the 1st, the 16th, or the day after the month's last day — tie to the earlier point), not from
 * running the code. Asserted in ../abrechnung-golden-360.test.ts.
 *
 * Apartments (house area 310 m², 6 apartments):
 * - apt-a  50 m²  seamless handover exactly mid-month: A1 out 21.02., A2 in 22.02. (15 + 15 Rechentage)
 * - apt-b  40 m²  seamless handover with a tie broken to the earlier point: B1 out 23.05., B2 in 24.05.
 * - apt-c  80 m²  WG with a mid-year move-out on a month end: C1 stays all year, C2 leaves 31.08.
 * - apt-d  60 m²  vacant all year (no tenant row at all)
 * - apt-e  45 m²  move-in on 28.03.: rounds forward to 01.04., so March counts 0 Rechentage
 * - apt-f  35 m²  tenant with no Einzugsdatum: 0 Rechentage, like a vacancy
 *
 * Prepayment schedules are all exactly 30 €/month (= RECHENTAGE_PRO_MONAT), so a tenant's Soll
 * prepayment on the 360-day basis (amount × Rechentage / 30) works out to their Rechentage in
 * euros — a deliberate simplification to make the hand-calculated numbers easy to check.
 */
import type { Finanzen, Mieter, Nebenkosten, Rechnung, Zaehler, ZaehlerAblesung } from '@/lib/types';
import { buildMeter, buildPayment, buildReading, buildRechnung, buildTenant } from './abrechnung-builders';

export const PERIOD = { startdatum: '2026-01-01', enddatum: '2026-12-31' } as const;

export const HOUSE = { id: 'house-360', name: 'Rechentageweg 3', area: 310, apartmentCount: 6 } as const;

export const APARTMENTS = {
  'apt-a': { name: 'Wohnung A', groesse: 50 },
  'apt-b': { name: 'Wohnung B', groesse: 40 },
  'apt-c': { name: 'WG C', groesse: 80 },
  'apt-d': { name: 'Wohnung D (Leerstand)', groesse: 60 },
  'apt-e': { name: 'Wohnung E', groesse: 45 },
  'apt-f': { name: 'Wohnung F', groesse: 35 },
} as const;

type ApartmentId = keyof typeof APARTMENTS;

const tenant = (id: string, wohnung_id: ApartmentId, einzug: string | null, auszug: string | null, schedule: Array<[string, string]>) =>
  buildTenant(id, wohnung_id, APARTMENTS[wohnung_id], einzug as string, auszug, schedule);

// A monthly Soll of 30 € for every tenant with a move-in date, dated well before the period so
// every occupied month finds it (see the file header for why 30 € was chosen).
const SOLL: Array<[string, string]> = [['2020-01-01', '30']];

export const TENANTS: Mieter[] = [
  // apt-a: seamless handover on the 21./22.02. — 15 + 15 Rechentage, no gap or overlap
  tenant('tenant-a1', 'apt-a', '2020-01-01', '2026-02-21', SOLL),
  tenant('tenant-a2', 'apt-a', '2026-02-22', null, SOLL),
  // apt-b: seamless handover on the 23./24.05. — the tie in a 31-day month breaks to the earlier point
  tenant('tenant-b1', 'apt-b', '2020-01-01', '2026-05-23', SOLL),
  tenant('tenant-b2', 'apt-b', '2026-05-24', null, SOLL),
  // apt-c: WG. C1 stays all year; C2 moves out at a month end (31.08., rounds to the full month)
  tenant('tenant-c1', 'apt-c', '2020-01-01', null, SOLL),
  tenant('tenant-c2', 'apt-c', '2020-01-01', '2026-08-31', SOLL),
  // apt-e: moves in 28.03. — rounds forward to 01.04., so March counts 0 Rechentage (not lost, see below)
  tenant('tenant-e', 'apt-e', '2026-03-28', null, SOLL),
  // apt-f: no move-in date at all — 0 Rechentage every month, like a vacancy
  tenant('tenant-f', 'apt-f', null, null, []),
  // apt-d is vacant all year: intentionally no tenant row
];

export const COST_ITEMS = {
  grundsteuer: { name: 'Grundsteuer', betrag: 3100, berechnungsart: 'pro Fläche' }, // 10 €/m²
  hauswart: { name: 'Hauswart', betrag: 1200, berechnungsart: 'pro Wohnung' }, // 200 €/apartment
  muell: { name: 'Müllabfuhr', betrag: 1590, berechnungsart: 'pro Mieter' }, // 1 €/Rechentag (sum of all tenants' Rechentage below)
  // betrag = the sum of the Rechnungen rows below (only tenant-c1 has one)
  sonderposten: { name: 'Sonderposten', betrag: 180, berechnungsart: 'nach Rechnung' },
} as const;

export type CostKey = keyof typeof COST_ITEMS;
export const COST_KEYS = Object.keys(COST_ITEMS) as CostKey[];

export const NEBENKOSTEN: Nebenkosten = {
  id: 'nk-2026-360',
  startdatum: PERIOD.startdatum,
  enddatum: PERIOD.enddatum,
  nebenkostenart: COST_KEYS.map(key => COST_ITEMS[key].name),
  betrag: COST_KEYS.map(key => COST_ITEMS[key].betrag),
  berechnungsart: COST_KEYS.map(key => COST_ITEMS[key].berechnungsart),
  // Building total: 360 € / 36 m³ = 10 €/m³ (only apt-a has a meter, see METERS below)
  zaehlerkosten: { kaltwasser: 360 },
  zaehlerverbrauch: { kaltwasser: 36 },
  haeuser_id: HOUSE.id,
  erstellt_von: 'user-test',
  gesamtFlaeche: HOUSE.area,
  anzahlWohnungen: HOUSE.apartmentCount,
  vorauszahlungs_art: 'soll',
  rechenbasis: '360_tage',
};

/** The same settlement on the calendar basis, for the "identical on both bases" assertions */
export const NEBENKOSTEN_CALENDAR: Nebenkosten = { ...NEBENKOSTEN, id: 'nk-2026-calendar', rechenbasis: 'kalendertage' };

export const RECHNUNGEN: Rechnung[] = [
  buildRechnung('re-c1', NEBENKOSTEN.id, 'tenant-c1', 'Sonderposten', 180),
];

export const METERS: Zaehler[] = [
  buildMeter('kw-a', 'apt-a', 'kaltwasser'),
];

// A single year-end reading: 36 m³ spread evenly over the 365 calendar days of 2026, split between
// tenant-a1 (up to 21.02.) and tenant-a2 (from 22.02.) by calendar days — water never uses Rechentage.
export const READINGS: ZaehlerAblesung[] = [
  buildReading('kw-a', '2026-12-31', 136, 36),
];

// 'actual' (Ist) prepayments for apt-e only: 30 €/month, all year. tenant-e moves in 28.03., a
// date that counts 0 Rechentage in March (see APARTMENTS above) — the 'actual' mode must still
// assign the March payment by calendar days, not lose it to 0 Rechentage.
export const ACTUAL_PAYMENTS: Finanzen[] = Array.from({ length: 12 }, (_, i) =>
  buildPayment('apt-e', `2026-${String(i + 1).padStart(2, '0')}-05`, 30)
);
