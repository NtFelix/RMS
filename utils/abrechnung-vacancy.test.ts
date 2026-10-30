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

  // 2025 is a valid 360-day (12 whole month) period: totalRechentage = 360, not the calendar 365.
  // Values below are worked out by hand from the Rechentage rules (rechentage.ts), not the code.
  describe('on the 360-day basis', () => {
    // t2's auszug (2025-06-30) sits exactly on a month end, so it rounds to the Rechenpunkt at the
    // end of June: Jan-Jun is exactly 180 of 360 Rechentage (half), not 181/365 as on the calendar
    const TENANTS_360 = [
      tenant('t1', 'a1', 'EG links', 50, '2024-01-01', null),
      tenant('t2', 'a2', 'EG rechts', 40, '2024-01-01', '2025-06-30'),
    ];
    const nk360 = (overrides: Partial<Nebenkosten> = {}) => nebenkosten({ rechenbasis: '360_tage', ...overrides });

    it('charges vacant Rechentage (not calendar days) per apartment', () => {
      const result = calculateVacancyCosts(nk360(), TENANTS_360, HOUSE_APARTMENTS);

      // a3: 60/200 × 2000 + 1095/3 = 965 €, all 360 Rechentage vacant
      // a2: (40/200 × 2000 + 1095/3) × 180/360 = 765 × 0.5 = 382.5 €
      expect(result.apartments).toEqual([
        { apartmentId: 'a3', apartmentName: 'OG', vacantDays: 360, amount: expect.closeTo(965, 6) },
        { apartmentId: 'a2', apartmentName: 'EG rechts', vacantDays: 180, amount: expect.closeTo(382.5, 6) },
      ]);
      expect(result.total).toBeCloseTo(1347.5, 6);
    });

    it('adds up with the tenants\' Rechentage shares to the apartments\' part of a pro Fläche item', () => {
      const nk = nk360({ nebenkostenart: ['Grundsteuer'], betrag: [2000], berechnungsart: ['pro Flaeche'] });

      const tenantShares = TENANTS_360.reduce((sum, t) => sum + calculateTenantCosts(t, nk, TENANTS_360).totalCost, 0);
      const vacancy = calculateVacancyCosts(nk, TENANTS_360, HOUSE_APARTMENTS).total;

      // The apartments hold 150 of the 200 m²: 2000 × 150/200 = 1500 €, same total as the calendar basis
      expect(tenantShares + vacancy).toBeCloseTo(1500, 6);
    });

    it('leaves an apartment vacant all period unaffected by the basis (never occupied on either)', () => {
      // a3 has no tenant on either basis, so its landlord share (1095/3) is the same regardless
      // of whether "vacant" is measured in calendar days or Rechentage
      const resultCalendar = calculateVacancyCosts(
        nebenkosten({ nebenkostenart: ['Hauswart'], betrag: [1095], berechnungsart: ['pro Wohnung'] }),
        TENANTS_360, HOUSE_APARTMENTS
      );
      const result360 = calculateVacancyCosts(
        nk360({ nebenkostenart: ['Hauswart'], betrag: [1095], berechnungsart: ['pro Wohnung'] }),
        TENANTS_360, HOUSE_APARTMENTS
      );

      expect(resultCalendar.apartments.find(a => a.apartmentId === 'a3')?.amount).toBeCloseTo(365, 6);
      expect(result360.apartments.find(a => a.apartmentId === 'a3')?.amount).toBeCloseTo(365, 6);
      // But a2 (partial occupancy) differs: 181/365 on the calendar basis vs. exactly 180/360 here
      expect(resultCalendar.apartments.find(a => a.apartmentId === 'a2')?.vacantDays).toBe(184);
      expect(result360.apartments.find(a => a.apartmentId === 'a2')?.vacantDays).toBe(180);
    });
  });
});
