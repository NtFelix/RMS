import { calculateTenantCosts, calculateVacancyCosts } from './abrechnung-calculations';
import type { Mieter, Nebenkosten } from '@/lib/types';

// 2025: 365 days. Values below are calculated by hand, not taken from the code.
const tenant = (id: string, wohnung_id: string, name: string, groesse: number, einzug: string, auszug: string | null) =>
  ({ id, name: id, wohnung_id, einzug, auszug, Wohnungen: { name, groesse } }) as unknown as Mieter;

// a1 50 m² occupied all year, a2 40 m² occupied until 30.06. (181 days, 184 empty), a3 60 m² empty all year
const TENANTS = [
  tenant('t1', 'a1', 'EG links', 50, '2024-01-01', null),
  tenant('t2', 'a2', 'EG rechts', 40, '2024-01-01', '2025-06-30'),
];
const HOUSE_APARTMENTS = [
  { id: 'a1', name: 'EG links', groesse: 50 },
  { id: 'a2', name: 'EG rechts', groesse: 40 },
  { id: 'a3', name: 'OG', groesse: 60 },
];

const nebenkosten = (overrides: Partial<Nebenkosten> = {}) => ({
  startdatum: '2025-01-01',
  enddatum: '2025-12-31',
  nebenkostenart: ['Grundsteuer', 'Hauswart', 'Müll', 'Reparatur'],
  betrag: [2000, 1095, 500, 300],
  berechnungsart: ['pro Flaeche', 'pro Wohnung', 'pro Mieter', 'nach Rechnung'],
  gesamtFlaeche: 200, // includes 50 m² that belong to no apartment
  anzahlWohnungen: 3,
  ...overrides,
}) as unknown as Nebenkosten;

describe('calculateVacancyCosts', () => {
  it('charges empty days per apartment for pro Fläche and pro Wohnung items only', () => {
    const result = calculateVacancyCosts(nebenkosten(), TENANTS, HOUSE_APARTMENTS);

    // a3: 60/200 × 2000 = 600 + 1095/3 = 365 → 965 €, all 365 days
    // a2: (40/200 × 2000 + 1095/3) × 184/365 = 765 × 184/365 = 385.643836 €
    expect(result.apartments).toEqual([
      { apartmentId: 'a3', apartmentName: 'OG', vacantDays: 365, amount: expect.closeTo(965, 6) },
      { apartmentId: 'a2', apartmentName: 'EG rechts', vacantDays: 184, amount: expect.closeTo(385.643836, 6) },
    ]);
    expect(result.total).toBeCloseTo(1350.643836, 6);
  });

  it('only knows the tenants\' apartments without the house apartment list', () => {
    const result = calculateVacancyCosts(nebenkosten(), TENANTS);

    expect(result.apartments.map(a => a.apartmentId)).toEqual(['a2']);
    expect(result.total).toBeCloseTo(385.643836, 6);
  });

  it('normalises legacy values: pro person is billed per tenant, an unknown value by area', () => {
    const result = calculateVacancyCosts(
      nebenkosten({ nebenkostenart: ['Müll', 'Wartung'], betrag: [500, 1000], berechnungsart: ['pro person', 'fix'] }),
      TENANTS,
      HOUSE_APARTMENTS
    );

    // Only 'fix' (1000 €) counts, by area: a3 60/200 × 1000 = 300 €
    expect(result.apartments[0]).toMatchObject({ apartmentId: 'a3', amount: expect.closeTo(300, 6) });
  });

  it('adds up with the tenants\' shares to the apartments\' part of a pro Fläche item', () => {
    const nk = nebenkosten({ nebenkostenart: ['Grundsteuer'], betrag: [2000], berechnungsart: ['pro Flaeche'] });

    const tenantShares = TENANTS.reduce((sum, t) => sum + calculateTenantCosts(t, nk, TENANTS).totalCost, 0);
    const vacancy = calculateVacancyCosts(nk, TENANTS, HOUSE_APARTMENTS).total;

    // The apartments hold 150 of the 200 m²: 2000 × 150/200 = 1500 €
    expect(tenantShares + vacancy).toBeCloseTo(1500, 6);
  });

  it('returns nothing without a billing period', () => {
    expect(calculateVacancyCosts(nebenkosten({ startdatum: '' }), TENANTS, HOUSE_APARTMENTS)).toEqual({ total: 0, apartments: [] });
  });
});
