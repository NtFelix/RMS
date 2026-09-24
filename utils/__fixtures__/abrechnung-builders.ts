/**
 * Builders for the golden Abrechnung fixtures: fill the fields the calculation ignores,
 * so the fixtures only show the data that matters for the expected results.
 */
import type { Finanzen, Mieter, Rechnung, Zaehler, ZaehlerAblesung, ZaehlerTyp } from '@/lib/types';

type Apartment = { name: string; groesse: number };

export const buildTenant = (
  id: string,
  wohnung_id: string,
  apartment: Apartment,
  einzug: string,
  auszug: string | null,
  // Prepayment schedule: [valid from, monthly amount as stored (string)]
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
  Wohnungen: { ...apartment },
});

export const buildRechnung = (id: string, nebenkosten_id: string, mieter_id: string, name: string, betrag: number): Rechnung => ({
  id,
  erstellt_von: 'user-test',
  organisation_id: 'org-test',
  nebenkosten_id,
  mieter_id,
  name,
  betrag,
});

export const buildMeter = (id: string, wohnung_id: string, zaehler_typ: ZaehlerTyp): Zaehler => ({
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

export const buildReading = (zaehler_id: string, ablese_datum: string, zaehlerstand: number, verbrauch: number): ZaehlerAblesung => ({
  id: `${zaehler_id}@${ablese_datum}`,
  zaehler_id,
  ablese_datum,
  zaehlerstand,
  verbrauch,
  erstellt_von: 'user-test',
  organisation_id: 'org-test',
});

export const buildPayment = (wohnung_id: string, datum: string, betrag: number): Finanzen => ({
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
