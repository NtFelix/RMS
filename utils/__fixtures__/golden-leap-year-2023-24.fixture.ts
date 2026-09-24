/**
 * Golden billing case 2: a billing period that is not a calendar year and contains a leap day.
 *
 * Period 15.07.2023 – 14.07.2024 = 366 days (includes 29.02.2024). Both edge months are partial:
 * July 2023 is billed for 17 of 31 days, July 2024 for 14 of 31 days.
 *
 * Every name and id is invented. The expected results are worked out by hand in the Notion page
 * "RMS Abrechnung golden tests: hand calculation", case 2
 * (https://app.notion.com/p/3e581e55ec3c81f7b53fcd426fb35061), and asserted in
 * ../abrechnung-golden-leap-year.test.ts.
 *
 * Apartments (house area 200 m², 3 apartments, none vacant):
 * - apt-a  80 m²  L1 all period
 * - apt-b  60 m²  handover on the leap day: L2 moves out 28.02.2024, L3 moves in 29.02.2024
 * - apt-c  60 m²  WG: L4 all period, L5 from 01.10.2023 and moving out on the leap day
 */
import type { Mieter, Nebenkosten, Rechnung, Zaehler, ZaehlerAblesung } from '@/lib/types';
import { buildMeter, buildReading, buildRechnung, buildTenant } from './abrechnung-builders';

export const PERIOD = { startdatum: '2023-07-15', enddatum: '2024-07-14', days: 366 } as const;

export const HOUSE = { id: 'house-beta', name: 'Beispielweg 3', area: 200, apartmentCount: 3 } as const;

export const APARTMENTS = {
  'apt-a': { name: 'Wohnung A', groesse: 80 },
  'apt-b': { name: 'Wohnung B', groesse: 60 },
  'apt-c': { name: 'WG C', groesse: 60 },
} as const;

type ApartmentId = keyof typeof APARTMENTS;

const tenant = (id: string, wohnung_id: ApartmentId, einzug: string, auszug: string | null, schedule: Array<[string, string]>) =>
  buildTenant(id, wohnung_id, APARTMENTS[wohnung_id], einzug, auszug, schedule);

export const TENANTS: Mieter[] = [
  // The 120 € entry is dated 20.07.2024: inside July, but after the period end (14.07.) — must be ignored
  tenant('tenant-l1', 'apt-a', '2020-01-01', null, [['2020-01-01', '100'], ['2024-07-20', '120']]),
  tenant('tenant-l2', 'apt-b', '2022-05-01', '2024-02-28', [['2023-01-01', '60'], ['2024-01-01', '70']]),
  tenant('tenant-l3', 'apt-b', '2024-02-29', null, [['2024-02-29', '80']]),
  tenant('tenant-l4', 'apt-c', '2021-03-01', null, [['2021-03-01', '90']]),
  tenant('tenant-l5', 'apt-c', '2023-10-01', '2024-02-29', [['2023-10-01', '50']]),
];

export const COST_ITEMS = {
  // 3660 € / 200 m² / 366 d = 0.05 €/m²/d
  grundsteuer: { name: 'Grundsteuer', betrag: 3660, berechnungsart: 'pro Fläche' },
  // 2500 € / 1250 person-days = 2 €/person-day
  muell: { name: 'Müllabfuhr', betrag: 2500, berechnungsart: 'pro Mieter' },
  // 1098 € / 3 apartments / 366 d = 1 €/apartment-day
  hauswart: { name: 'Hauswart', betrag: 1098, berechnungsart: 'pro Wohnung' },
  // betrag = sum of the Rechnungen rows below
  garten: { name: 'Gartenpflege', betrag: 256.2, berechnungsart: 'nach Rechnung' },
} as const;

export type CostKey = keyof typeof COST_ITEMS;
export const COST_KEYS = Object.keys(COST_ITEMS) as CostKey[];

export const NEBENKOSTEN: Nebenkosten = {
  id: 'nk-2023-24',
  startdatum: PERIOD.startdatum,
  enddatum: PERIOD.enddatum,
  nebenkostenart: COST_KEYS.map(key => COST_ITEMS[key].name),
  betrag: COST_KEYS.map(key => COST_ITEMS[key].betrag),
  berechnungsart: COST_KEYS.map(key => COST_ITEMS[key].berechnungsart),
  // 450 € / 150 m³ = 3 €/m³
  zaehlerkosten: { kaltwasser: 450 },
  zaehlerverbrauch: { kaltwasser: 150 },
  haeuser_id: HOUSE.id,
  erstellt_von: 'user-test',
  gesamtFlaeche: HOUSE.area,
  anzahlWohnungen: HOUSE.apartmentCount,
  vorauszahlungs_art: 'soll',
};

export const RECHNUNGEN: Rechnung[] = [
  buildRechnung('re-l2', NEBENKOSTEN.id, 'tenant-l2', 'Gartenpflege', 183),
  buildRechnung('re-l3', NEBENKOSTEN.id, 'tenant-l3', 'Gartenpflege', 73.2),
];

export const METERS: Zaehler[] = [
  buildMeter('kw-a', 'apt-a', 'kaltwasser'),
  buildMeter('kw-b', 'apt-b', 'kaltwasser'),
  buildMeter('kw-c', 'apt-c', 'kaltwasser'),
];

export const READINGS: ZaehlerAblesung[] = [
  // 36.6 m³ over 366 days (0.1 m³/day)
  buildReading('kw-a', '2024-07-14', 536.6, 36.6),
  // Move-out reading on 28.02.: 229 days · 0.1 m³; the next interval starts on the leap day: 137 days · 0.1 m³
  buildReading('kw-b', '2024-02-28', 422.9, 22.9),
  buildReading('kw-b', '2024-07-14', 436.6, 13.7),
  // 73.2 m³ over 366 days (0.2 m³/day), shared by L4 and L5 for 152 days
  buildReading('kw-c', '2024-07-14', 873.2, 73.2),
];
