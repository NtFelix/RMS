/**
 * Golden end-to-end test of the Betriebskostenabrechnung on the 360-day basis (rechenbasis:
 * '360_tage'). One fictional house (utils/__fixtures__/golden-360-2026.fixture.ts) runs through
 * the real calculation chain — Rechentage → WG Rechentage shares → cost distribution → meter
 * costs → prepayments → settlement — with nothing mocked.
 *
 * Every expected Rechentage figure is worked out BY HAND from the rules in rechentage.ts (see the
 * fixture file header), never derived from running the code. Money is asserted to within 0.005 €
 * (toBeCloseTo(x, 2)).
 */
import {
  calculateCompleteTenantResult,
  calculateOccupancyPercentage,
  calculatePrepayments,
  calculateVacancyCosts,
} from './abrechnung-calculations';
import { computeWgFactorsByTenant } from './wg-cost-calculations';
import type { TenantCalculationResult } from '@/types/optimized-betriebskosten';
import {
  ACTUAL_PAYMENTS,
  APARTMENTS,
  COST_ITEMS,
  COST_KEYS,
  type CostKey,
  HOUSE,
  METERS,
  NEBENKOSTEN,
  NEBENKOSTEN_CALENDAR,
  PERIOD,
  READINGS,
  RECHNUNGEN,
  TENANTS,
} from './__fixtures__/golden-360-2026.fixture';

// Hand-calculated Rechentage (see the fixture file header for the derivation of each date)
const RECHENTAGE: Record<string, number> = {
  'tenant-a1': 45, // Jan (30) + 15 of Feb (out 21.02., rounds to the 16th-31st boundary)
  'tenant-a2': 315, // 15 of Feb (in 22.02.) + Mar-Dec (300)
  'tenant-b1': 135, // Jan-Apr (120) + 15 of May (out 23.05., tie broken to the earlier point)
  'tenant-b2': 225, // 15 of May (in 24.05.) + Jun-Dec (210)
  'tenant-c1': 360, // present the whole period
  'tenant-c2': 240, // Jan-Aug (out 31.08., a month end: the full month counts)
  'tenant-e': 270, // Apr-Dec (in 28.03., rounds forward to 01.04.: 0 Rechentage in March)
  'tenant-f': 0, // no move-in date
};
const TENANT_IDS = Object.keys(RECHENTAGE);

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const EUR = 2; // decimal places for toBeCloseTo on money: |diff| < 0.005 €

function calculateAll(nebenkosten = NEBENKOSTEN): Record<string, TenantCalculationResult> {
  const wgFactors = computeWgFactorsByTenant(TENANTS, PERIOD.startdatum, PERIOD.enddatum, nebenkosten.rechenbasis);
  return Object.fromEntries(TENANTS.map(t => [
    t.id,
    calculateCompleteTenantResult(t, nebenkosten, TENANTS, METERS, READINGS, undefined, 'scheduled', RECHNUNGEN, wgFactors),
  ]));
}

const tenantShare = (result: TenantCalculationResult, key: CostKey) =>
  result.operatingCosts.costItems.find(item => item.costName === COST_ITEMS[key].name)!.tenantShare;

describe('Golden house 2026 — full Abrechnung on the 360-day basis', () => {
  const results = calculateAll();

  describe('fixture', () => {
    it('is a consistent house: 6 apartments summing to 310 m², a valid 12-month window', () => {
      expect(sum(Object.values(APARTMENTS).map(a => a.groesse))).toBe(HOUSE.area);
      expect(Object.keys(APARTMENTS)).toHaveLength(HOUSE.apartmentCount);
      expect(TENANT_IDS.sort()).toEqual(TENANTS.map(t => t.id).sort());
    });
  });

  describe('Rechentage', () => {
    it.each(TENANT_IDS)('%s: Rechentage of 360', id => {
      const tenant = TENANTS.find(t => t.id === id)!;
      const occupancy = calculateOccupancyPercentage(tenant, PERIOD.startdatum, PERIOD.enddatum, NEBENKOSTEN.rechenbasis);

      expect(occupancy.daysInPeriod).toBe(360);
      expect(occupancy.daysOccupied).toBe(RECHENTAGE[id]);
      expect(occupancy.percentage).toBeCloseTo((RECHENTAGE[id] / 360) * 100, 10);
      expect(occupancy.rechentage?.rechentage).toBe(RECHENTAGE[id]);
      expect(occupancy.rechentage?.totalRechentage).toBe(360);
    });

    it('rounds the 28.03. move-in forward to 01.04., billing from April, not March', () => {
      const tenant = TENANTS.find(t => t.id === 'tenant-e')!;
      const occupancy = calculateOccupancyPercentage(tenant, PERIOD.startdatum, PERIOD.enddatum, '360_tage');

      expect(occupancy.effectivePeriodStart).toBe('2026-04-01');
      expect(occupancy.rechentage?.einzugGerundet).toBe(true);
      expect(occupancy.rechentage?.einzugGerundetIso).toBe('2026-04-01');
    });

    it('splits a seamless handover 15 + 15 without a gap or double-count (apt-a, apt-b)', () => {
      expect(RECHENTAGE['tenant-a1'] + RECHENTAGE['tenant-a2']).toBe(360);
      expect(RECHENTAGE['tenant-b1'] + RECHENTAGE['tenant-b2']).toBe(360);
    });

    it('a tenant without an Einzugsdatum counts 0, exactly as on the calendar basis', () => {
      expect(RECHENTAGE['tenant-f']).toBe(0);
      const calendarOccupancy = calculateOccupancyPercentage(TENANTS.find(t => t.id === 'tenant-f')!, PERIOD.startdatum, PERIOD.enddatum);
      expect(calendarOccupancy.daysOccupied).toBe(0);
    });
  });

  describe('WG Rechentage shares (apt-c)', () => {
    const factors = computeWgFactorsByTenant(TENANTS, PERIOD.startdatum, PERIOD.enddatum, '360_tage');

    it('splits the shared Jan-Aug Rechentage evenly, then gives C1 the rest alone', () => {
      // Jan-Aug (240 Rechentage) shared 50/50 = 120 each; Sep-Dec (120) solo to C1
      expect(factors['tenant-c1'] * 360).toBeCloseTo(120 + 120, 8);
      expect(factors['tenant-c2'] * 360).toBeCloseTo(120, 8);
    });

    it('never leaves the WG apartment vacant (factors sum to 1)', () => {
      expect(factors['tenant-c1'] + factors['tenant-c2']).toBeCloseTo(1, 10);
    });
  });

  describe('operating costs per cost item', () => {
    it.each(COST_KEYS)('%s: tenant shares + vacancy add up to the total within 0.01 €', key => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], key)));
      const isVacancyEligible = COST_ITEMS[key].berechnungsart === 'pro Fläche' || COST_ITEMS[key].berechnungsart === 'pro Wohnung';

      if (!isVacancyEligible) {
        // pro Mieter and nach Rechnung go to tenants only — no landlord vacancy share
        expect(billed).toBeCloseTo(COST_ITEMS[key].betrag, 2);
      } else {
        // A single Nebenkosten item's own vacancy share isn't broken out by calculateVacancyCosts
        // (it only returns per-apartment totals across all pro Fläche/pro Wohnung items combined),
        // so just check tenants never exceed the item's total; the exact split is asserted below.
        expect(billed).toBeLessThanOrEqual(COST_ITEMS[key].betrag + 0.01);
      }
    });

    it('bills pro Fläche (Grundsteuer, 10 €/m²): apt-d, apt-f fully vacant, apt-e 1/4 vacant', () => {
      // apt-d (60 m², fully vacant): 60/310 × 3100 = 600 €
      // apt-f (35 m², fully vacant): 35/310 × 3100 = 350 €
      // apt-e (45 m², 1/4 vacant: Jan-Mar): 45/310 × 3100 × 0.25 = 112.5 €
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'grundsteuer')));
      expect(COST_ITEMS.grundsteuer.betrag - billed).toBeCloseTo(600 + 350 + 112.5, EUR);
      expect(billed).toBeCloseTo(3100 - 1062.5, EUR);

      // Individual shares: apt-a and apt-b are fully occupied all year (50 €/m² and 40 €/m² apartment
      // totals, split by each Rechentage share); apt-c (WG) splits its 800 € by the WG factors above.
      expect(tenantShare(results['tenant-a1'], 'grundsteuer')).toBeCloseTo(500 * (45 / 360), EUR);
      expect(tenantShare(results['tenant-a2'], 'grundsteuer')).toBeCloseTo(500 * (315 / 360), EUR);
      expect(tenantShare(results['tenant-c1'], 'grundsteuer')).toBeCloseTo(800 * (240 / 360), EUR);
      expect(tenantShare(results['tenant-c2'], 'grundsteuer')).toBeCloseTo(800 * (120 / 360), EUR);
    });

    it('bills pro Wohnung (Hauswart, 200 €/apartment) the same way, per apartment instead of per m²', () => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'hauswart')));
      // apt-d 200 + apt-f 200 + apt-e 200 × 0.25 = 450 €
      expect(COST_ITEMS.hauswart.betrag - billed).toBeCloseTo(450, EUR);
    });

    it('distributes pro Mieter (Müllabfuhr) completely over 1,590 Rechentage at 1 €/Rechentag', () => {
      for (const id of TENANT_IDS) {
        expect(tenantShare(results[id], 'muell')).toBeCloseTo(RECHENTAGE[id], EUR);
      }
      expect(sum(TENANT_IDS.map(id => tenantShare(results[id], 'muell')))).toBeCloseTo(1590, EUR);
    });

    it('bills nach Rechnung (Sonderposten) from the tenant\'s own invoice, prorated by occupancy', () => {
      // tenant-c1 is present the whole period (occupancy 100%), so its 180 € invoice is billed in full
      expect(tenantShare(results['tenant-c1'], 'sonderposten')).toBeCloseTo(180, EUR);
      expect(tenantShare(results['tenant-c2'], 'sonderposten')).toBe(0);
    });
  });

  describe('meter (water) costs — identical on both bases', () => {
    const resultsCalendar = calculateAll(NEBENKOSTEN_CALENDAR);

    it.each(TENANT_IDS)('%s: same water cost whether rechenbasis is 360_tage or kalendertage', id => {
      expect(results[id].meterCosts.totalCost).toBe(resultsCalendar[id].meterCosts.totalCost);
      expect(results[id].meterCosts.tenantConsumption).toBe(resultsCalendar[id].meterCosts.tenantConsumption);
    });

    it('splits apt-a\'s water by calendar days (a1 up to 21.02., a2 from 22.02.), not by Rechentage', () => {
      // 36 m³ over 365 calendar days: a1 has 52 days (01.01.-21.02.), a2 has 313 (22.02.-31.12.)
      const a1 = results['tenant-a1'].meterCosts;
      const a2 = results['tenant-a2'].meterCosts;
      expect(a1.tenantConsumption).toBeCloseTo(36 * 52 / 365, 4);
      expect(a2.tenantConsumption).toBeCloseTo(36 * 313 / 365, 4);
      expect(a1.tenantConsumption + a2.tenantConsumption).toBeCloseTo(36, 4);
    });
  });

  describe('prepayments (scheduled / Soll) — Rechentage / 30', () => {
    it.each(TENANT_IDS)('%s: Soll prepayment equals the tenant\'s Rechentage in euros', id => {
      // Every schedule entry is 30 €/month (= RECHENTAGE_PRO_MONAT), so amount × Rechentage/30 in
      // euros numerically equals the Rechentage figure — see the fixture file header.
      expect(results[id].prepayments.totalPrepayments).toBeCloseTo(RECHENTAGE[id], EUR);
    });

    it('prorates the move-in month by Rechentage, not calendar days (apt-a: 30 € × 15/30 in Feb)', () => {
      const tenantA2 = TENANTS.find(t => t.id === 'tenant-a2')!;
      const months = calculatePrepayments(tenantA2, PERIOD.startdatum, PERIOD.enddatum, undefined, 'scheduled', undefined, '360_tage').monthlyPayments;

      expect(months[0].amount).toBe(0); // January: not moved in yet
      expect(months[1].amount).toBeCloseTo(15, EUR); // February: 15 of 30 Rechentage
      expect(months[2].amount).toBe(30); // March onward: full month
    });

    it('gives tenant-e (28.03. move-in) 0 € Soll in March, matching its 0 Rechentage that month', () => {
      const tenantE = TENANTS.find(t => t.id === 'tenant-e')!;
      const months = calculatePrepayments(tenantE, PERIOD.startdatum, PERIOD.enddatum, undefined, 'scheduled', undefined, '360_tage').monthlyPayments;

      expect(months.slice(0, 3).map(m => m.amount)).toEqual([0, 0, 0]); // Jan, Feb, Mar
      expect(months[3].amount).toBe(30); // April: first full Rechentage month
    });
  });

  describe('prepayments (actual payments / Ist) — stays on calendar days', () => {
    it("credits the tenant-e March payment in full, although 28.03. counts 0 Rechentage that month", () => {
      const result360 = calculateCompleteTenantResult(
        TENANTS.find(t => t.id === 'tenant-e')!, NEBENKOSTEN, TENANTS, METERS, READINGS, ACTUAL_PAYMENTS, 'actual', RECHNUNGEN
      );
      const march = result360.prepayments.monthlyPayments.find(m => m.month === '2026-03')!;

      // The money is not lost: tenant-e is the sole occupant of record for March (28.-31.), so
      // the whole payment is assigned, exactly as on the calendar basis
      expect(march.amount).toBeCloseTo(30, EUR);
      // But the reported occupancy reflects Rechentage: 0 in March for this move-in date
      expect(march.isActiveMonth).toBe(false);
      expect(march.occupancyPercentage).toBe(0);
    });

    it('gives the identical total Ist prepayment whether rechenbasis is 360_tage or kalendertage', () => {
      const tenantE = TENANTS.find(t => t.id === 'tenant-e')!;
      const total360 = calculateCompleteTenantResult(tenantE, NEBENKOSTEN, TENANTS, METERS, READINGS, ACTUAL_PAYMENTS, 'actual', RECHNUNGEN)
        .prepayments.totalPrepayments;
      const totalCalendar = calculateCompleteTenantResult(tenantE, NEBENKOSTEN_CALENDAR, TENANTS, METERS, READINGS, ACTUAL_PAYMENTS, 'actual', RECHNUNGEN)
        .prepayments.totalPrepayments;

      // March (30) + April-December (9 × 30) = 300; January and February's payments go uncredited
      // on both bases (nobody occupied apt-e yet, same accepted limitation as on the calendar basis)
      expect(total360).toBeCloseTo(300, EUR);
      expect(total360).toBe(totalCalendar);
    });
  });

  describe('vacancy costs', () => {
    const houseApartments = Object.entries(APARTMENTS).map(([id, apartment]) => ({ id, ...apartment }));
    const vacancy = calculateVacancyCosts(NEBENKOSTEN, TENANTS, houseApartments);

    it('charges apt-d and apt-f their full Rechentage (360) and apt-e a quarter (90)', () => {
      expect(vacancy.apartments.map(a => [a.apartmentId, a.vacantDays])).toEqual(
        expect.arrayContaining([
          ['apt-d', 360],
          ['apt-f', 360],
          ['apt-e', 90],
        ])
      );
      // Never lists apt-a, apt-b or apt-c: they are fully occupied every Rechentag of the period
      expect(vacancy.apartments.map(a => a.apartmentId)).not.toEqual(expect.arrayContaining(['apt-a', 'apt-b', 'apt-c']));
    });

    it('matches the landlord\'s vacancy share left over from Grundsteuer + Hauswart', () => {
      // 600 + 200 (apt-d) + 350 + 200 (apt-f) + 112.5 + 50 (apt-e, 1/4 of 650) = 1512.5
      expect(vacancy.total).toBeCloseTo(1512.5, EUR);
    });
  });

  describe('settlement', () => {
    it('accounts for every euro: tenants + landlord vacancy = the sum of all cost items', () => {
      const billedTotal = sum(TENANT_IDS.map(id => results[id].operatingCosts.totalCost));
      const vacancy = calculateVacancyCosts(NEBENKOSTEN, TENANTS, Object.entries(APARTMENTS).map(([id, a]) => ({ id, ...a }))).total;
      const totalCostItems = sum(COST_KEYS.map(key => COST_ITEMS[key].betrag));

      expect(billedTotal + vacancy).toBeCloseTo(totalCostItems, EUR);
    });
  });
});
