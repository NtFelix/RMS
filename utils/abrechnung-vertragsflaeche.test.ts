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
import { analysiereWgVerteilung, computeWgFactorsByTenant } from './wg-cost-calculations';
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

/** Same tenant, apartment W with the remaining area option switched on (`Wohnungen.restflaeche_verteilen`). */
const mitRestflaeche = (t: Mieter): Mieter => ({ ...t, Wohnungen: { ...APT_W, restflaeche_verteilen: true } });

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

  it('a single contract smaller than the apartment (65 of 70 m²): 928.57 € tenant, 71.43 € vacancy', () => {
    // 1000 × 65/70 = 928.5714 €; vacancy 1000 × 5/70 = 71.4286 €
    const { kosten, leerstand } = rechne([zimmer('a', 65), mieterX()]);
    expect(kosten.a).toBeCloseTo(928.5714, EUR);
    expect(leerstand).toBeCloseTo(71.4286, EUR);
  });

  describe('remaining area option (A 50 m², B and C without area, apartment W 70 m², 1000 €)', () => {
    // With option: A 1000 × 50/70 = 714.2857 €; rest 1000 × 20/70 = 285.7143 € in equal parts -> B, C 142.8571 € each; no vacancy
    it('option on: A 714.29 €, B 142.86 €, C 142.86 €', () => {
      const tenants = [mitRestflaeche(zimmer('a', 50)), mitRestflaeche(zimmer('b', null)), mitRestflaeche(zimmer('c', null)), mieterX()];
      const { kosten, leerstand } = rechne(tenants);
      expect(kosten.a).toBeCloseTo(714.2857, EUR);
      expect(kosten.b).toBeCloseTo(142.8571, EUR);
      expect(kosten.c).toBeCloseTo(142.8571, EUR);
      expect(leerstand).toBeCloseTo(0, EUR);
      expect(kosten.x1).toBeCloseTo(600, EUR);
      expect(analysiereWgVerteilung(tenants, '2025-01-01', '2025-12-31', 'kalendertage').tageJeWohnung['apt-w']).toEqual({ restflaeche: 365 });
    });

    // Without option (default): one present tenant without area -> equal split, 1000 / 3 = 333.3333 € each
    it('option off: 333.33 € each, and the days are marked as split equally because an area is missing', () => {
      const tenants = [zimmer('a', 50), zimmer('b', null), zimmer('c', null), mieterX()];
      const { kosten } = rechne(tenants);
      expect(kosten.a).toBeCloseTo(333.3333, EUR);
      expect(kosten.b).toBeCloseTo(333.3333, EUR);
      expect(kosten.c).toBeCloseTo(333.3333, EUR);
      expect(analysiereWgVerteilung(tenants, '2025-01-01', '2025-12-31', 'kalendertage').tageJeWohnung['apt-w']).toEqual({ gleich_flaeche_fehlt: 365 });
    });

    // 360 days, same figures: the shares do not depend on the day count when everybody is present all year
    it('360 days: same 714.29 / 142.86 / 142.86 €', () => {
      const tenants = [mitRestflaeche(zimmer('a', 50)), mitRestflaeche(zimmer('b', null)), mitRestflaeche(zimmer('c', null)), mieterX()];
      const { kosten } = rechne(tenants, '360_tage');
      expect(kosten.a).toBeCloseTo(714.2857, EUR);
      expect(kosten.b).toBeCloseTo(142.8571, EUR);
      expect(kosten.c).toBeCloseTo(142.8571, EUR);
      expect(analysiereWgVerteilung(tenants, '2025-01-01', '2025-12-31', '360_tage').tageJeWohnung['apt-w']).toEqual({ restflaeche: 360 });
    });

    // Areas 50 + 30 = 80 m² >= 70 m²: nothing left for C -> equal split 1000 / 3 = 333.3333 € each, days marked accordingly
    it('nothing left (A 50, B 30, C without area): equal split and marked as used up', () => {
      const tenants = [mitRestflaeche(zimmer('a', 50)), mitRestflaeche(zimmer('b', 30)), mitRestflaeche(zimmer('c', null)), mieterX()];
      const { kosten } = rechne(tenants);
      expect(kosten.a).toBeCloseTo(333.3333, EUR);
      expect(kosten.b).toBeCloseTo(333.3333, EUR);
      expect(kosten.c).toBeCloseTo(333.3333, EUR);
      expect(analysiereWgVerteilung(tenants, '2025-01-01', '2025-12-31', 'kalendertage').tageJeWohnung['apt-w']).toEqual({ gleich_restflaeche_aufgebraucht: 365 });
    });

    // C moves out on 30.06.2025 (181 days present, 184 days only A and B).
    //   Jan-Jun: A 50/70, B and C 10/70 each;  Jul-Dec: A 50/70, B 20/70 (B is the only one without area and gets the whole rest)
    //   A: 1000 × 50/70 = 714.2857 €
    //   B: 1000 × (10/70 × 181 + 20/70 × 184) / 365 = 1000 × (1810 + 3680) / 25550 = 214.8728 €
    //   C: 1000 × 10/70 × 181/365 = 70.8415 €;  714.2857 + 214.8728 + 70.8415 = 1000.0000, no vacancy
    it('a tenant without area moves out: the rest goes to the remaining one', () => {
      const tenants = [
        mitRestflaeche(zimmer('a', 50)),
        mitRestflaeche(zimmer('b', null)),
        mitRestflaeche(zimmer('c', null, '2023-01-01', '2025-06-30')),
        mieterX(),
      ];
      const { kosten, leerstand } = rechne(tenants);
      expect(kosten.a).toBeCloseTo(714.2857, EUR);
      expect(kosten.b).toBeCloseTo(214.8728, EUR);
      expect(kosten.c).toBeCloseTo(70.8415, EUR);
      expect(leerstand).toBeCloseTo(0, EUR);
    });
  });
});
