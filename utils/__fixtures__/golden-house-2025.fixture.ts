/**
 * Golden billing case: one fictional house, one calendar-year Abrechnung (2025, 365 days).
 *
 * Every name, id and address is invented. The expected results for this data are worked
 * out by hand in the Notion page "RMS Golden house 2025: hand calculation"
 * (https://app.notion.com/p/3e581e55ec3c81f7b53fcd426fb35061) and asserted in ../abrechnung-golden-house.test.ts.
 *
 * Apartments (house area 400 m², 6 apartments):
 * - apt-101  50 m²  seamless handover: A moves out 31.07., B moves in 01.08.
 * - apt-102  40 m²  handover with a 16-day vacancy: C out 15.05., empty 16.–31.05., D in 01.06.
 * - apt-201 120 m²  WG, staggered move-ins: empty until 14.04., WG1 alone 15.–30.04., WG1–WG3 from 01.05.
 * - apt-202  90 m²  WG with turnover and an empty room: WG4 all year, WG5 out 31.03., WG6 in 01.05.
 * - apt-301  60 m²  vacant all year (no tenant row at all)
 * - apt-302  40 m²  control case: one tenant all year
 */
import type { Finanzen, Mieter, Nebenkosten, Rechnung, Zaehler, ZaehlerAblesung, ZaehlerTyp } from '@/lib/types';

export const PERIOD = { startdatum: '2025-01-01', enddatum: '2025-12-31', days: 365 } as const;

export const HOUSE = { id: 'house-alpha', name: 'Musterstraße 10', area: 400, apartmentCount: 6 } as const;

export const APARTMENTS = {
  'apt-101': { name: 'Wohnung 101', groesse: 50 },
  'apt-102': { name: 'Wohnung 102', groesse: 40 },
  'apt-201': { name: 'WG 201', groesse: 120 },
  'apt-202': { name: 'WG 202', groesse: 90 },
  'apt-301': { name: 'Wohnung 301 (Leerstand)', groesse: 60 },
  'apt-302': { name: 'Wohnung 302', groesse: 40 },
} as const;

type ApartmentId = keyof typeof APARTMENTS;

const tenant = (
  id: string,
  wohnung_id: ApartmentId,
  einzug: string,
  auszug: string | null,
  schedule: Array<[date: string, amount: string]>
): Mieter => ({
  id,
  wohnung_id,
  name: id,
  einzug,
  auszug,
  email: null,
  telefonnummer: null,
  notiz: null,
  nebenkosten: schedule.map(([date, amount], i) => ({ id: `${id}-nk-${i + 1}`, date, amount })),
  erstellt_von: 'user-test',
  Wohnungen: { ...APARTMENTS[wohnung_id] },
});

// Prepayment schedules: the newest entry dated on or before a month's end applies to that month.
export const TENANTS: Mieter[] = [
  tenant('tenant-a', 'apt-101', '2024-01-01', '2025-07-31', [['2024-01-01', '50'], ['2025-03-01', '60']]),
  tenant('tenant-b', 'apt-101', '2025-08-01', null, [['2025-08-01', '70']]),
  tenant('tenant-c', 'apt-102', '2023-01-01', '2025-05-15', [['2023-01-01', '45']]),
  tenant('tenant-d', 'apt-102', '2025-06-01', null, [['2025-06-01', '55']]),
  tenant('tenant-wg1', 'apt-201', '2025-04-15', null, [['2025-04-15', '80']]),
  tenant('tenant-wg2', 'apt-201', '2025-05-01', null, [['2025-05-01', '65']]),
  // No prepayment schedule entered: must surface as missing months, not as a silent 0 €
  tenant('tenant-wg3', 'apt-201', '2025-05-01', null, []),
  tenant('tenant-wg4', 'apt-202', '2022-01-01', null, [['2022-01-01', '90'], ['2025-05-01', '100']]),
  tenant('tenant-wg5', 'apt-202', '2022-01-01', '2025-03-31', [['2022-01-01', '90']]),
  tenant('tenant-wg6', 'apt-202', '2025-05-01', null, [['2025-05-01', '100']]),
  // The 2026 entry lies after the period and must be ignored
  tenant('tenant-s', 'apt-302', '2020-01-01', null, [['2020-01-01', '75'], ['2026-01-01', '85']]),
];

export const COST_ITEMS = {
  grundsteuer: { name: 'Grundsteuer', betrag: 3650, berechnungsart: 'pro Fläche' },
  versicherung: { name: 'Gebäudeversicherung', betrag: 1000, berechnungsart: 'pro Fläche' },
  muell: { name: 'Müllabfuhr', betrag: 2530, berechnungsart: 'pro Mieter' },
  hauswart: { name: 'Hauswart', betrag: 2190, berechnungsart: 'pro Wohnung' },
  // betrag = sum of the Rechnungen rows below
  garten: { name: 'Gartenpflege', betrag: 425, berechnungsart: 'nach Rechnung' },
} as const;

export type CostKey = keyof typeof COST_ITEMS;
export const COST_KEYS = Object.keys(COST_ITEMS) as CostKey[];

export const NEBENKOSTEN: Nebenkosten = {
  id: 'nk-2025',
  startdatum: PERIOD.startdatum,
  enddatum: PERIOD.enddatum,
  nebenkostenart: COST_KEYS.map(key => COST_ITEMS[key].name),
  betrag: COST_KEYS.map(key => COST_ITEMS[key].betrag),
  berechnungsart: COST_KEYS.map(key => COST_ITEMS[key].berechnungsart),
  // Building totals from the main meters: 1280 € / 320 m³ = 4 €/m³, 1350 € / 150 m³ = 9 €/m³
  zaehlerkosten: { kaltwasser: 1280, warmwasser: 1350 },
  zaehlerverbrauch: { kaltwasser: 320, warmwasser: 150 },
  haeuser_id: HOUSE.id,
  erstellt_von: 'user-test',
  gesamtFlaeche: HOUSE.area,
  anzahlWohnungen: HOUSE.apartmentCount,
  vorauszahlungs_art: 'soll',
};

const rechnung = (id: string, mieter_id: string, name: string, betrag: number): Rechnung => ({
  id,
  erstellt_von: 'user-test',
  organisation_id: 'org-test',
  nebenkosten_id: NEBENKOSTEN.id,
  mieter_id,
  name,
  betrag,
});

export const RECHNUNGEN: Rechnung[] = [
  rechnung('re-a', 'tenant-a', 'Gartenpflege', 146),
  rechnung('re-d', 'tenant-d', 'Gartenpflege', 73),
  rechnung('re-wg1', 'tenant-wg1', 'Gartenpflege', 109.5),
  rechnung('re-s', 'tenant-s', 'Gartenpflege', 60),
  // Saved with surrounding whitespace: must still match "Gartenpflege"
  rechnung('re-wg4', 'tenant-wg4', ' Gartenpflege ', 36.5),
  // Different cost name: must not be billed as Gartenpflege
  rechnung('re-b-other', 'tenant-b', 'Winterdienst', 999),
];

const meter = (id: string, wohnung_id: ApartmentId, zaehler_typ: ZaehlerTyp): Zaehler => ({
  id,
  custom_id: id.toUpperCase(),
  wohnung_id,
  erstellungsdatum: '2020-01-01',
  eichungsdatum: null,
  zaehler_typ,
  einheit: 'm³',
  ist_aktiv: true,
  erstellt_von: 'user-test',
});

export const METERS: Zaehler[] = [
  meter('kw-101', 'apt-101', 'kaltwasser'), meter('ww-101', 'apt-101', 'warmwasser'),
  meter('kw-102', 'apt-102', 'kaltwasser'), meter('ww-102', 'apt-102', 'warmwasser'),
  meter('kw-201', 'apt-201', 'kaltwasser'), meter('ww-201', 'apt-201', 'warmwasser'),
  meter('kw-202', 'apt-202', 'kaltwasser'), meter('ww-202', 'apt-202', 'warmwasser'),
  // Vacant apartment: its consumption belongs to no tenant
  meter('kw-301', 'apt-301', 'kaltwasser'),
  meter('kw-302', 'apt-302', 'kaltwasser'), meter('ww-302', 'apt-302', 'warmwasser'),
];

const reading = (zaehler_id: string, ablese_datum: string, zaehlerstand: number, verbrauch: number): ZaehlerAblesung => ({
  id: `${zaehler_id}@${ablese_datum}`,
  zaehler_id,
  ablese_datum,
  zaehlerstand,
  verbrauch,
  erstellt_von: 'user-test',
  organisation_id: 'org-test',
});

// A reading's verbrauch covers the days since the previous reading (the first one: since period start).
export const READINGS: ZaehlerAblesung[] = [
  // Move-out reading on A's last day: 212 days · 0.2 m³, then 153 days · 0.2 m³
  reading('kw-101', '2025-07-31', 1042.4, 42.4), reading('kw-101', '2025-12-31', 1073, 30.6),
  // Only a year-end reading: 36.5 m³ spread evenly over 365 days (0.1 m³/day)
  reading('ww-101', '2025-12-31', 536.5, 36.5),
  // Move-out reading for C, then 23 m³ over 230 days of which 16 are vacant
  reading('kw-102', '2025-05-15', 827, 27), reading('kw-102', '2025-12-31', 850, 23),
  reading('ww-102', '2025-12-31', 418.25, 18.25),
  reading('kw-201', '2025-12-31', 1273, 73), reading('ww-201', '2025-12-31', 636.5, 36.5),
  // Move-out reading for WG5, then 55 m³ over 275 days
  reading('kw-202', '2025-03-31', 918, 18), reading('kw-202', '2025-12-31', 973, 55),
  reading('ww-202', '2025-12-31', 736.5, 36.5),
  reading('kw-301', '2025-12-31', 101.5, 1.5),
  // Reading of the previous period: must be ignored (counting it would stretch the next interval to 396 days)
  reading('kw-302', '2024-11-30', 1055, 99),
  reading('kw-302', '2025-12-31', 1100, 45), reading('ww-302', '2025-12-31', 520, 20),
];

const payment = (wohnung_id: ApartmentId, datum: string, betrag: number): Finanzen => ({
  id: `pay-${wohnung_id}-${datum}`,
  wohnung_id,
  name: 'Nebenkostenvorauszahlung',
  datum,
  betrag,
  ist_einnahmen: true,
  notiz: null,
  erstellt_von: 'user-test',
  dokument_id: null,
  tags: ['Nebenkosten', 'Vorauszahlung'],
});

const monthly = (wohnung_id: ApartmentId, months: number[], betrag: number) =>
  months.map(m => payment(wohnung_id, `2025-${String(m).padStart(2, '0')}-03`, betrag));

// Actual payments ('ist' mode), already filtered to prepayments as fetchActualPrepayments does
export const ACTUAL_PAYMENTS: Finanzen[] = [
  // apt-101: A pays Jan–Jul (2 × 50 + 5 × 60 = 400 €), B pays Aug–Dec (5 × 70 = 350 €)
  ...monthly('apt-101', [1, 2], 50),
  ...monthly('apt-101', [3, 4, 5, 6, 7], 60),
  ...monthly('apt-101', [8, 9, 10, 11, 12], 70),
  // apt-302: 12 × 75 = 900 € inside the period, plus one payment before and one after it
  ...monthly('apt-302', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 75),
  payment('apt-302', '2024-12-03', 75),
  payment('apt-302', '2026-01-03', 85),
];
