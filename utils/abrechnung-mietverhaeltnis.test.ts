/**
 * Golden tests of the Abrechnung per tenancy (GH-17, phase 6): couple, flat share with single contracts, flat
 * share with one contract and change of person, each on the calendar basis and on the 360-day basis.
 *
 * The real calculation chain runs with nothing mocked. Every expected figure is worked out BY HAND (see the
 * derivation next to each block), never derived from running the code. Money is asserted to within 0.005 €.
 * All names, IDs and amounts are synthetic.
 *
 * House (2025, 365 calendar days / 360 Rechentage): apartment A 60 m² (the apartment under test) and apartment B
 * 40 m² (one tenant all year) = 100 m², 2 apartments.
 *   Grundsteuer 1000 € "pro Fläche"  -> 10 €/m²   -> A 600 €, B 400 € for the whole year
 *   Hauswart     600 € "pro Wohnung" -> 300 €/apt -> A 300 €, B 300 € for the whole year
 */
import type { Mieter, Rechnung } from '@/lib/types';
import type { Nebenkosten } from '@/lib/types';
import { calculateCompleteTenantResult } from './abrechnung-calculations';
import { computeWgFactorsByTenant } from './wg-cost-calculations';
import { buildRechnung, buildTenant } from './__fixtures__/abrechnung-builders';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fasseGemeinsameMietverhaeltnisseZusammen } from './abrechnung-mietverhaeltnis';
import { gruppiereNachMietverhaeltnisImZeitraum } from '@/lib/abrechnung-mietverhaeltnis-laden';

const APT_A = { name: 'Wohnung A', groesse: 60 };
const APT_B = { name: 'Wohnung B', groesse: 40 };
const EUR = 2; // toBeCloseTo(x, 2): |diff| < 0.005 €

const nebenkosten = (rechenbasis: 'kalendertage' | '360_tage', extra: Partial<Nebenkosten> = {}): Nebenkosten => ({
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
  ...extra,
} as Nebenkosten);

const BASES = ['kalendertage', '360_tage'] as const;

/** Tenant of apartment B (one tenant all year) completes every house. */
const mieterB = (): Mieter => buildTenant('b1', 'apt-b', APT_B, '2020-01-01', null, [['2025-01-01', '80']]);

/** Tenant row of apartment A that belongs to a tenancy. */
const zeileA = (id: string, mv: string, einzug: string, auszug: string | null, schedule: Array<[string, string]>): Mieter => ({
  ...buildTenant(id, 'apt-a', APT_A, einzug, auszug, schedule),
  mietverhaeltnis_id: mv,
});

/** Runs the calculation for every tenant of the (possibly merged) list, like the billing run does. */
function rechne(tenants: Mieter[], rechenbasis: (typeof BASES)[number], rechnungen: Rechnung[] = []) {
  const nk = nebenkosten(rechenbasis);
  const wgFactors = computeWgFactorsByTenant(tenants, nk.startdatum, nk.enddatum, nk.rechenbasis);
  return Object.fromEntries(
    tenants.map(t => [t.id, calculateCompleteTenantResult(t, nk, tenants, [], [], undefined, 'scheduled', rechnungen, wgFactors)])
  );
}

describe('fasseGemeinsameMietverhaeltnisseZusammen', () => {
  describe('couple, one tenancy, whole year', () => {
    // Costs of apartment A for the whole year: 600 + 300 = 900 €. Prepayments: (100 + 50) €/month x 12 = 1800 €.
    const zeilen = () => [
      zeileA('a1', 'mv-a', '2023-01-01', null, [['2025-01-01', '100']]),
      zeileA('a2', 'mv-a', '2023-01-01', null, [['2025-01-01', '50']]),
      mieterB(),
    ];

    it.each(BASES)('%s, one tenancy: one settlement for the tenancy (900 € costs, 1800 € prepaid, -900 € result)', basis => {
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen());
      expect(tenants.map(t => t.id)).toEqual(['a1', 'b1']);
      const ergebnis = rechne(tenants, basis);
      expect(ergebnis.a1.operatingCosts.costItems.map(i => i.tenantShare)).toEqual([expect.closeTo(600, EUR), expect.closeTo(300, EUR)]);
      expect(ergebnis.a1.operatingCosts.totalCost).toBeCloseTo(900, EUR);
      expect(ergebnis.a1.prepayments.totalPrepayments).toBeCloseTo(1800, EUR);
      expect(ergebnis.a1.finalSettlement).toBeCloseTo(-900, EUR);
      // apartment B is not touched: 400 + 300 = 700 € costs, 12 x 80 = 960 € prepaid
      expect(ergebnis.b1.operatingCosts.totalCost).toBeCloseTo(700, EUR);
      expect(ergebnis.b1.finalSettlement).toBeCloseTo(-260, EUR);
    });

    it.each(BASES)('%s, each person with an own tenancy: unchanged, two settlements of 450 € that add up to the shared one', basis => {
      const getrennt = [{ ...zeilen()[0], mietverhaeltnis_id: 'mv-a1' }, { ...zeilen()[1], mietverhaeltnis_id: 'mv-a2' }, mieterB()];
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(getrennt);
      expect(tenants.map(t => t.id)).toEqual(['a1', 'a2', 'b1']);
      const ergebnis = rechne(tenants, basis);
      // each tenant bears half of the apartment: 300 + 150 = 450 €; prepaid 1200 € and 600 €
      expect(ergebnis.a1.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(ergebnis.a2.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(ergebnis.a1.finalSettlement).toBeCloseTo(-750, EUR);
      expect(ergebnis.a2.finalSettlement).toBeCloseTo(-150, EUR);
      expect(ergebnis.a1.finalSettlement + ergebnis.a2.finalSettlement).toBeCloseTo(-900, EUR);
    });
  });

  describe('couple moves out together on 30.06.2025', () => {
    // Calendar: occupancy 181/365 -> Grundsteuer 600 x 181/365 = 297.5342, Hauswart 300 x 181/365 = 148.7671, total 446.3014.
    // 360 days: Jan-Jun = 180 Rechentage = 0.5 -> 300 + 150 = 450. Prepayments Jan-Jun: 6 x 150 = 900 on both bases.
    const zeilen = () => [
      zeileA('a1', 'mv-a', '2023-01-01', '2025-06-30', [['2025-01-01', '100']]),
      zeileA('a2', 'mv-a', '2023-01-01', '2025-06-30', [['2025-01-01', '50']]),
      mieterB(),
    ];

    it('calendar days, one tenancy', () => {
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen());
      const a = rechne(tenants, 'kalendertage').a1;
      expect(a.daysOccupied).toBe(181);
      expect(a.operatingCosts.totalCost).toBeCloseTo(446.3014, EUR);
      expect(a.prepayments.totalPrepayments).toBeCloseTo(900, EUR);
      expect(a.finalSettlement).toBeCloseTo(-453.6986, EUR);
    });

    it('360 days, one tenancy', () => {
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen());
      const a = rechne(tenants, '360_tage').a1;
      expect(a.rechentage?.rechentage).toBe(180);
      expect(a.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(a.prepayments.totalPrepayments).toBeCloseTo(900, EUR);
      expect(a.finalSettlement).toBeCloseTo(-450, EUR);
    });
  });

  describe('flat share with single contracts (three tenancies, three rows)', () => {
    // Each of the three tenants bears a third of the apartment: Grundsteuer 200 + Hauswart 100 = 300 €.
    const zeilen = () => [
      zeileA('w1', 'mv-w1', '2023-01-01', null, [['2025-01-01', '60']]),
      zeileA('w2', 'mv-w2', '2023-01-01', null, [['2025-01-01', '60']]),
      zeileA('w3', 'mv-w3', '2023-01-01', null, [['2025-01-01', '60']]),
      mieterB(),
    ];

    it('is returned unchanged, one row per tenancy, nothing to merge', () => {
      const eingabe = zeilen();
      const { tenants, zusammengefasst } = fasseGemeinsameMietverhaeltnisseZusammen(eingabe);
      expect(tenants).toBe(eingabe);
      expect(zusammengefasst.size).toBe(0);
    });

    it.each(BASES)('%s: three settlements of 300 €', basis => {
      const ergebnis = rechne(zeilen(), basis);
      for (const id of ['w1', 'w2', 'w3']) expect(ergebnis[id].operatingCosts.totalCost).toBeCloseTo(300, EUR);
    });
  });

  describe('flat share with one contract (three rows, one tenancy)', () => {
    // One settlement for the whole apartment: 600 + 300 = 900 €, prepaid 3 x 60 x 12 = 2160 €, result -1260 €.
    it.each(BASES)('%s: merged to one tenant, names joined, prepayments added up', basis => {
      const zeilen = [
        zeileA('w1', 'mv-w', '2023-01-01', null, [['2025-01-01', '60']]),
        zeileA('w2', 'mv-w', '2024-03-01', null, [['2025-01-01', '60']]),
        zeileA('w3', 'mv-w', '2024-09-01', null, [['2025-01-01', '60']]),
        mieterB(),
      ];
      const { tenants, zusammengefasst } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen);
      expect(zusammengefasst.get('w1')).toEqual(['w1', 'w2', 'w3']);
      expect(tenants.find(t => t.id === 'w1')).toMatchObject({ name: 'w1, w2, w3', einzug: '2023-01-01', auszug: null });
      const a = rechne(tenants, basis).w1;
      expect(a.operatingCosts.totalCost).toBeCloseTo(900, EUR);
      expect(a.prepayments.totalPrepayments).toBeCloseTo(2160, EUR);
      expect(a.finalSettlement).toBeCloseTo(-1260, EUR);
    });
  });

  describe('change of person inside one contract (p1 until 30.06.2025, p2 from 01.07.2025)', () => {
    // p1 pays 100 €/month, p2 pays 120 €/month. Merged: one continuous tenancy, whole year.
    //   costs 600 + 300 = 900 €; prepaid Jan-Jun 6 x 100 + Jul-Dec 6 x 120 = 1320 €; result -420 €.
    // Single settlements (rows not merged), by hand:
    //   calendar: p1 181/365 -> 297.5342 + 148.7671 = 446.3014 €, prepaid 600 -> -153.6986 €
    //             p2 184/365 -> 302.4658 + 151.2329 = 453.6986 €, prepaid 720 -> -266.3014 €
    //   360 days: Jan-Jun 180 and Jul-Dec 180 Rechentage -> 0.5 each -> 450 € each, prepaid 600 and 720 -> -150 € and -270 €
    const zeilen = () => [
      zeileA('p1', 'mv-p', '2020-01-01', '2025-06-30', [['2020-01-01', '100']]),
      zeileA('p2', 'mv-p', '2025-07-01', null, [['2025-07-01', '120']]),
      mieterB(),
    ];

    it.each(BASES)('%s, one tenancy: the leaving person does not count after the move-out', basis => {
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen());
      const merged = tenants.find(t => t.id === 'p1')!;
      expect(merged).toMatchObject({ einzug: '2020-01-01', auszug: null, name: 'p1, p2' });
      expect(merged.nebenkosten?.map(n => [n.date, n.amount])).toEqual([
        ['2025-07-01', '120'],
        ['2020-01-01', '100'],
      ]);
      const a = rechne(tenants, basis).p1;
      expect(a.operatingCosts.totalCost).toBeCloseTo(900, EUR);
      expect(a.prepayments.totalPrepayments).toBeCloseTo(1320, EUR);
      expect(a.finalSettlement).toBeCloseTo(-420, EUR);
    });

    it('calendar days, rows not merged: two settlements', () => {
      const ergebnis = rechne(zeilen(), 'kalendertage');
      expect(ergebnis.p1.operatingCosts.totalCost).toBeCloseTo(446.3014, EUR);
      expect(ergebnis.p2.operatingCosts.totalCost).toBeCloseTo(453.6986, EUR);
      expect(ergebnis.p1.finalSettlement).toBeCloseTo(-153.6986, EUR);
      expect(ergebnis.p2.finalSettlement).toBeCloseTo(-266.3014, EUR);
    });

    it('360 days, rows not merged: two settlements', () => {
      const ergebnis = rechne(zeilen(), '360_tage');
      expect(ergebnis.p1.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(ergebnis.p2.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(ergebnis.p1.finalSettlement).toBeCloseTo(-150, EUR);
      expect(ergebnis.p2.finalSettlement).toBeCloseTo(-270, EUR);
    });
  });

  describe('2025 settled, merged into one tenancy on 01.03.2026: 2025 stays unchanged', () => {
    // a1 and a2 had their own tenancies in 2025 (mv-a1, mv-a2); a2 joins mv-a1 on 01.03.2026. The assignment history
    // keeps 2025 with the old tenancies, so the settlement of 2025 is the one of the separate rows: 450 € each,
    // -750 € and -150 € (see "couple, one tenancy, whole year"). The current tenancy (mv-a1 for both) is not used.
    const zeilen = () => [
      zeileA('a1', 'mv-a1', '2023-01-01', null, [['2025-01-01', '100']]),
      zeileA('a2', 'mv-a1', '2023-01-01', null, [['2025-01-01', '50']]),
      mieterB(),
    ];
    const historie = [
      { mieter_id: 'a1', mietverhaeltnis_id: 'mv-a1', gueltig_ab: '2023-01-01', gueltig_bis: null },
      { mieter_id: 'a2', mietverhaeltnis_id: 'mv-a2', gueltig_ab: '2023-01-01', gueltig_bis: '2026-02-28' },
      { mieter_id: 'a2', mietverhaeltnis_id: 'mv-a1', gueltig_ab: '2026-03-01', gueltig_bis: null },
      { mieter_id: 'b1', mietverhaeltnis_id: 'mv-b', gueltig_ab: '2020-01-01', gueltig_bis: null },
    ];
    const supabase = {
      from: () => ({ select: () => ({ in: async () => ({ data: historie, error: null }) }) }),
    } as unknown as SupabaseClient;

    it.each(BASES)('%s: two settlements of 450 €, results -750 € and -150 € as before the merge', async basis => {
      const eingabe = { tenants: zeilen(), rechnungen: [] };
      const { tenants } = await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, { startdatum: '2025-01-01', enddatum: '2025-12-31' });
      expect(tenants.map(t => t.id)).toEqual(['a1', 'a2', 'b1']);
      const ergebnis = rechne(tenants, basis);
      expect(ergebnis.a1.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(ergebnis.a2.operatingCosts.totalCost).toBeCloseTo(450, EUR);
      expect(ergebnis.a1.finalSettlement).toBeCloseTo(-750, EUR);
      expect(ergebnis.a2.finalSettlement).toBeCloseTo(-150, EUR);
    });

    it('for comparison: grouped by the current tenancy, 2025 would wrongly become one settlement', () => {
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen());
      expect(tenants.map(t => t.id)).toEqual(['a1', 'b1']);
    });
  });

  describe('"pro Mieter": a shared tenancy counts once', () => {
    // Müllabfuhr 730 € "pro Mieter" on the calendar basis. Tenant-days: apartment A 365 (merged) + apartment B 365 = 730,
    // so 1 € per tenant-day -> A 365 €, B 365 €. (Without merging, three rows would share 730 / 1095 = 0.6667 € per day.)
    it('splits 730 € evenly between the tenancy and the single tenant', () => {
      const zeilen = [
        zeileA('a1', 'mv-a', '2023-01-01', null, [['2025-01-01', '100']]),
        zeileA('a2', 'mv-a', '2023-01-01', null, [['2025-01-01', '50']]),
        mieterB(),
      ];
      const { tenants } = fasseGemeinsameMietverhaeltnisseZusammen(zeilen);
      const nk = nebenkosten('kalendertage', { nebenkostenart: ['Müllabfuhr'], betrag: [730], berechnungsart: ['pro Mieter'] });
      const wg = computeWgFactorsByTenant(tenants, nk.startdatum, nk.enddatum, nk.rechenbasis);
      const a = calculateCompleteTenantResult(tenants[0], nk, tenants, [], [], undefined, 'scheduled', [], wg);
      const b = calculateCompleteTenantResult(tenants[1], nk, tenants, [], [], undefined, 'scheduled', [], wg);
      expect(a.operatingCosts.totalCost).toBeCloseTo(365, EUR);
      expect(b.operatingCosts.totalCost).toBeCloseTo(365, EUR);
    });
  });

  describe('merge rules', () => {
    it('keeps the original rows untouched (no mutation)', () => {
      const eingabe = [zeileA('a1', 'mv-a', '2023-01-01', null, [['2025-01-01', '100']]), zeileA('a2', 'mv-a', '2023-01-01', null, [['2025-01-01', '50']])];
      const kopie = JSON.parse(JSON.stringify(eingabe));
      fasseGemeinsameMietverhaeltnisseZusammen(eingabe);
      expect(eingabe).toEqual(kopie);
    });

    it('move-out is empty while one row still lives there, otherwise the latest move-out', () => {
      const beide = [zeileA('a1', 'mv-a', '2023-01-01', '2025-03-31', []), zeileA('a2', 'mv-a', '2024-01-01', '2025-09-30', [])];
      expect(fasseGemeinsameMietverhaeltnisseZusammen(beide).tenants[0]).toMatchObject({ einzug: '2023-01-01', auszug: '2025-09-30' });
      const einer = [zeileA('a1', 'mv-a', '2023-01-01', '2025-03-31', []), zeileA('a2', 'mv-a', '2024-01-01', null, [])];
      expect(fasseGemeinsameMietverhaeltnisseZusammen(einer).tenants[0].auszug).toBeNull();
    });

    it('a row without move-in date does not count for the dates and the prepayments', () => {
      const zeilen = [zeileA('a1', 'mv-a', '2023-01-01', null, [['2025-01-01', '100']]), { ...zeileA('a2', 'mv-a', '2023-01-01', null, [['2025-01-01', '50']]), einzug: null }];
      const merged = fasseGemeinsameMietverhaeltnisseZusammen(zeilen).tenants[0];
      expect(merged.einzug).toBe('2023-01-01');
      expect(merged.nebenkosten?.map(n => n.amount)).toEqual(['100']);
    });

    it('has no prepayment schedule when no row has one', () => {
      const zeilen = [zeileA('a1', 'mv-a', '2023-01-01', null, []), zeileA('a2', 'mv-a', '2023-01-01', null, [])];
      expect(fasseGemeinsameMietverhaeltnisseZusammen(zeilen).tenants[0].nebenkosten).toBeNull();
    });

    it('re-assigns invoices of the merged rows to the merged tenant, others stay', () => {
      const zeilen = [zeileA('a1', 'mv-a', '2023-01-01', null, []), zeileA('a2', 'mv-a', '2023-01-01', null, []), mieterB()];
      const rechnungen = [buildRechnung('r1', 'nk', 'a2', 'Sonderposten', 90), buildRechnung('r2', 'nk', 'b1', 'Sonderposten', 40)];
      const ergebnis = fasseGemeinsameMietverhaeltnisseZusammen(zeilen, rechnungen);
      expect(ergebnis.rechnungen.map(r => r.mieter_id)).toEqual(['a1', 'b1']);
      expect(rechnungen[0].mieter_id).toBe('a2');
    });

    it('adds up invoices of the same cost item of merged rows instead of dropping one', () => {
      const zeilen = [zeileA('a1', 'mv-a', '2023-01-01', null, []), zeileA('a2', 'mv-a', '2023-01-01', null, []), mieterB()];
      const rechnungen = [
        buildRechnung('r1', 'nk', 'a1', 'Sonderposten', 90),
        buildRechnung('r2', 'nk', 'a2', 'Sonderposten', 40.5),
        buildRechnung('r3', 'nk', 'a2', 'Schornsteinfeger', 20),
        buildRechnung('r4', 'nk', 'b1', 'Sonderposten', 15),
      ];
      const ergebnis = fasseGemeinsameMietverhaeltnisseZusammen(zeilen, rechnungen);
      expect(ergebnis.rechnungen.map(r => [r.mieter_id, r.name, r.betrag])).toEqual([
        ['a1', 'Sonderposten', 130.5],
        ['a1', 'Schornsteinfeger', 20],
        ['b1', 'Sonderposten', 15],
      ]);
      expect(rechnungen.map(r => r.betrag)).toEqual([90, 40.5, 20, 15]);
    });

    it('does not merge rows without apartment or without tenancy, and keeps the order of the list', () => {
      const ohneWohnung = { ...zeileA('x1', 'mv-a', '2023-01-01', null, []), wohnung_id: null };
      const ohneMv = { ...zeileA('x2', 'mv-a', '2023-01-01', null, []), mietverhaeltnis_id: null };
      const ergebnis = fasseGemeinsameMietverhaeltnisseZusammen([ohneWohnung, mieterB(), ohneMv]);
      expect(ergebnis.tenants.map(t => t.id)).toEqual(['x1', 'b1', 'x2']);
      expect(ergebnis.zusammengefasst.size).toBe(0);
    });

    it('merges at the position of the first row and merges rows of different apartments of one tenancy separately', () => {
      const zeilen = [
        mieterB(),
        zeileA('a1', 'mv-a', '2023-01-01', null, []),
        { ...zeileA('c1', 'mv-a', '2023-01-01', null, []), wohnung_id: 'apt-c' },
        zeileA('a2', 'mv-a', '2023-01-01', null, []),
      ];
      const ergebnis = fasseGemeinsameMietverhaeltnisseZusammen(zeilen);
      expect(ergebnis.tenants.map(t => t.id)).toEqual(['b1', 'a1', 'c1']);
    });
  });
});
