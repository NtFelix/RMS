/**
 * Golden tests of the contract area in a flat share with single contracts (GH-17): the apartment share is split by
 * contract area instead of equally, a room without tenant stays vacancy (landlord), and contract areas that together exceed
 * the apartment are reduced so that at most 100 % are distributed.
 *
 * The real calculation chain runs with nothing mocked. Every expected figure is worked out BY HAND (see the derivation next to
 * each block), never derived from running the code. Money is asserted to within 0.005 €. All names, IDs and amounts are synthetic.
 *
 * House (2025, 365 calendar days / 360 Rechentage): apartment W 70 m² (the flat share under test) and apartment X 30 m² (one
 * tenant all year) = 100 m², 2 apartments.
 *   Grundsteuer 1000 € "pro Fläche"  -> 10 €/m²   -> W 700 €, X 300 € for the whole year
 *   Hauswart     600 € "pro Wohnung" -> 300 €/apt -> W 300 €, X 300 € for the whole year
 *   Apartment W for the whole year: 700 + 300 = 1000 €.
 */
import type { Mieter, Nebenkosten } from '@/lib/types';
import { calculateCompleteTenantResult, calculateVacancyCosts } from './abrechnung-calculations';
import { computeWgFactorsByTenant } from './wg-cost-calculations';
import { buildTenant } from './__fixtures__/abrechnung-builders';

const APT_W = { name: 'Wohnung W', groesse: 70 };
const APT_X = { name: 'Wohnung X', groesse: 30 };
const EUR = 2; // toBeCloseTo(x, 2): |diff| < 0.005 €

const nebenkosten = (rechenbasis: 'kalendertage' | '360_tage'): Nebenkosten => ({
  id: `nk-${rechenbasis}`,
  startdatum: '2025-01-01',
  enddatum: '2025-12-31',
  nebenkostenart: ['Grundsteuer', 'Hauswart'],
  betrag: [1000, 600],
  berechnungsart: ['pro Fläche', 'pro Wohnung'],
  zaehlerkosten: {},
  zaehlerverbrauch: {},
  haeuser_id: 'haus-test',
  erstellt_von: 'user-test',
  gesamtFlaeche: 100,
  anzahlWohnungen: 2,
  vorauszahlungs_art: 'soll',
  rechenbasis,
} as Nebenkosten);

/** Tenant of apartment X (one tenant all year) completes the house. */
const mieterX = (): Mieter => buildTenant('x1', 'apt-x', APT_X, '2020-01-01', null, [['2025-01-01', '80']]);

/** Room tenant of the flat share W with an optional contract area (m², incl. the agreed share of common areas). */
const zimmer = (id: string, flaeche: number | null, einzug = '2023-01-01', auszug: string | null = null): Mieter => ({
  ...buildTenant(id, 'apt-w', APT_W, einzug, auszug, [['2025-01-01', '50']]),
  vertragsflaeche: flaeche,
});

/** Operating costs per tenant and the vacancy amount of apartment W, like the billing run computes them. */
function rechne(tenants: Mieter[], rechenbasis: 'kalendertage' | '360_tage' = 'kalendertage') {
  const nk = nebenkosten(rechenbasis);
  const wgFactors = computeWgFactorsByTenant(tenants, nk.startdatum, nk.enddatum, nk.rechenbasis);
  const kosten = Object.fromEntries(
    tenants.map(t => [t.id, calculateCompleteTenantResult(t, nk, tenants, [], [], undefined, 'scheduled', [], wgFactors).operatingCosts.totalCost])
  );
  const leerstand = calculateVacancyCosts(nk, tenants, undefined, wgFactors).apartments.find(a => a.apartmentId === 'apt-w')?.amount ?? 0;
  return { kosten, leerstand };
}

describe('contract area in a flat share with single contracts', () => {
  it('splits the apartment by area: 50 and 20 m² of 70 m² -> 714.29 € and 285.71 €, no vacancy', () => {
    // A: 1000 × 50/70 = 714.2857 €; B: 1000 × 20/70 = 285.7143 €
    const { kosten, leerstand } = rechne([zimmer('a', 50), zimmer('b', 20), mieterX()]);
    expect(kosten.a).toBeCloseTo(714.2857, EUR);
    expect(kosten.b).toBeCloseTo(285.7143, EUR);
    expect(leerstand).toBeCloseTo(0, EUR);
    // apartment X is not touched: 300 + 300 = 600 €
    expect(kosten.x1).toBeCloseTo(600, EUR);
  });

  describe('room B empty from 01.07.2025 (B moves out on 30.06.2025)', () => {
    // Calendar: B present 181 of 365 days.
    //   A: whole year 50/70 -> 714.2857 € (unchanged, A pays only its own area)
    //   B: 1000 × 20/70 × 181/365 = 285.7143 × 0.495890 = 141.6830 €
    //   vacancy (landlord): 1000 × 20/70 × 184/365 = 144.0313 €;  714.2857 + 141.6830 + 144.0313 = 1000
    it('calendar days: A keeps its 714.29 €, the empty room stays with the landlord', () => {
      const { kosten, leerstand } = rechne([zimmer('a', 50), zimmer('b', 20, '2023-01-01', '2025-06-30'), mieterX()]);
      expect(kosten.a).toBeCloseTo(714.2857, EUR);
      expect(kosten.b).toBeCloseTo(141.683, EUR);
      expect(leerstand).toBeCloseTo(144.0313, EUR);
    });

    // 360 days: Jan-Jun = 180 Rechentage = 0.5 -> B 285.7143 × 0.5 = 142.8571 €, vacancy 142.8571 €, A 714.2857 €.
    it('360 days: A 714.29 €, B 142.86 €, vacancy 142.86 €', () => {
      const { kosten, leerstand } = rechne([zimmer('a', 50), zimmer('b', 20, '2023-01-01', '2025-06-30'), mieterX()], '360_tage');
      expect(kosten.a).toBeCloseTo(714.2857, EUR);
      expect(kosten.b).toBeCloseTo(142.8571, EUR);
      expect(leerstand).toBeCloseTo(142.8571, EUR);
    });

    // For comparison, without areas (equal split per day, as before): Jan-Jun two tenants, Jul-Dec only A.
    //   A: 500 × 181/365 + 1000 × 184/365 = 247.9452 + 504.1096 = 752.0548 €;  B: 500 × 181/365 = 247.9452 €;  no vacancy
    it('without areas the empty room is passed on to A (old rule, unchanged)', () => {
      const { kosten, leerstand } = rechne([zimmer('a', null), zimmer('b', null, '2023-01-01', '2025-06-30'), mieterX()]);
      expect(kosten.a).toBeCloseTo(752.0548, EUR);
      expect(kosten.b).toBeCloseTo(247.9452, EUR);
      expect(leerstand).toBeCloseTo(0, EUR);
    });
  });

  it('reduces overlapping areas (50 + 40 = 90 m² > 70 m²) so that at most 100 % are distributed', () => {
    // basis = max(70, 90) = 90: A 1000 × 50/90 = 555.5556 €, B 1000 × 40/90 = 444.4444 €, no vacancy
    const { kosten, leerstand } = rechne([zimmer('a', 50), zimmer('b', 40), mieterX()]);
    expect(kosten.a).toBeCloseTo(555.5556, EUR);
    expect(kosten.b).toBeCloseTo(444.4444, EUR);
    expect(leerstand).toBeCloseTo(0, EUR);
  });

  it('a single tenant with an area pays only its area (50 of 70 m²), the rest is vacancy', () => {
    // A 714.2857 €, vacancy 1000 × 20/70 = 285.7143 €
    const { kosten, leerstand } = rechne([zimmer('a', 50), mieterX()]);
    expect(kosten.a).toBeCloseTo(714.2857, EUR);
    expect(leerstand).toBeCloseTo(285.7143, EUR);
  });

  it('falls back to the equal split when one present tenant has no area', () => {
    // A 50 m², B without area -> equal: 500 € each
    const { kosten } = rechne([zimmer('a', 50), zimmer('b', null), mieterX()]);
    expect(kosten.a).toBeCloseTo(500, EUR);
    expect(kosten.b).toBeCloseTo(500, EUR);
  });

  it('falls back to the equal split when the apartment size is unknown', () => {
    const ohneGroesse = (t: Mieter): Mieter => ({ ...t, Wohnungen: { name: 'Wohnung W', groesse: 0 } });
    const tenants = [ohneGroesse(zimmer('a', 50)), ohneGroesse(zimmer('b', 20)), mieterX()];
    const factors = computeWgFactorsByTenant(tenants, '2025-01-01', '2025-12-31', 'kalendertage');
    expect(factors.a).toBeCloseTo(0.5, 6);
    expect(factors.b).toBeCloseTo(0.5, 6);
  });
});
