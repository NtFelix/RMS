/**
 * Golden end-to-end test of the Betriebskostenabrechnung, case 2: a 366-day billing period
 * (15.07.2023 – 14.07.2024) with a leap day and partial months at both edges.
 *
 * Same approach as abrechnung-golden-house.test.ts: the real calculation chain with nothing
 * mocked, and hand-calculated literal expected values. The derivation is in the Notion page
 * "RMS Abrechnung golden tests: hand calculation", case 2 (https://app.notion.com/p/3e581e55ec3c81f7b53fcd426fb35061).
 *
 * Money is asserted to within 0.0005 € (toBeCloseTo(x, 3)).
 */
import {
  calculateAbrechnungSummary,
  calculateCompleteTenantResult,
  calculateOccupancyPercentage,
  calculatePrepayments,
} from './abrechnung-calculations';
import { calculateTotalDays } from './date-calculations';
import { computeWgFactorsByTenant } from './wg-cost-calculations';
import type { TenantCalculationResult } from '@/types/optimized-betriebskosten';
import {
  COST_ITEMS,
  COST_KEYS,
  type CostKey,
  METERS,
  NEBENKOSTEN,
  PERIOD,
  READINGS,
  RECHNUNGEN,
  TENANTS,
} from './__fixtures__/golden-leap-year-2023-24.fixture';

type Expected = {
  days: number;
  shareDays: number;
  costs: Record<CostKey, number>;
  operating: number;
  m3: number;
  meter: number;
  total: number;
  /** Prepayment per month, July 2023 … July 2024 (13 months) */
  months: number[];
  prepayments: number;
  settlement: number;
  recommendedPrepayment: number;
};

// Hand-calculated results (see the Notion page linked above for every formula)
const EXPECTED: Record<string, Expected> = {
  'tenant-l1': {
    days: 366, shareDays: 366,
    costs: { grundsteuer: 1464.0, muell: 732.0, hauswart: 366.0, garten: 0 },
    operating: 2562.0, m3: 36.6, meter: 109.8, total: 2671.8,
    // 100 × 17/31, 11 × 100, 100 × 14/31 (not 120: that entry is dated after the period end)
    months: [54.83871, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 45.16129],
    prepayments: 1200.0, settlement: 1471.8, recommendedPrepayment: 2940,
  },
  'tenant-l2': {
    days: 229, shareDays: 229,
    costs: { grundsteuer: 687.0, muell: 458.0, hauswart: 229.0, garten: 114.5 },
    operating: 1488.5, m3: 22.9, meter: 68.7, total: 1557.2,
    // 60 × 17/31, 5 × 60, 70 (Jan), 70 × 28/29 (Feb, moved out on the 28th)
    months: [32.903226, 60, 60, 60, 60, 60, 70, 67.586207, 0, 0, 0, 0, 0],
    prepayments: 470.489433, settlement: 1086.710567, recommendedPrepayment: 1740,
  },
  'tenant-l3': {
    days: 137, shareDays: 137,
    costs: { grundsteuer: 411.0, muell: 274.0, hauswart: 137.0, garten: 27.4 },
    operating: 849.4, m3: 13.7, meter: 41.1, total: 890.5,
    // 80 × 1/29 (moved in on the leap day), 4 × 80, 80 × 14/31
    months: [0, 0, 0, 0, 0, 0, 0, 2.758621, 80, 80, 80, 80, 36.129032],
    prepayments: 358.887653, settlement: 531.612347, recommendedPrepayment: 960,
  },
  'tenant-l4': {
    days: 366, shareDays: 290,
    costs: { grundsteuer: 870.0, muell: 732.0, hauswart: 290.0, garten: 0 },
    operating: 1892.0, m3: 58.0, meter: 174.0, total: 2066.0,
    months: [49.354839, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 40.645161],
    prepayments: 1080.0, settlement: 986.0, recommendedPrepayment: 2280,
  },
  'tenant-l5': {
    days: 152, shareDays: 76,
    costs: { grundsteuer: 228.0, muell: 304.0, hauswart: 76.0, garten: 0 },
    operating: 608.0, m3: 15.2, meter: 45.6, total: 653.6,
    // Oct–Feb in full: moving out on 29.02. covers all of February
    months: [0, 0, 0, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0],
    prepayments: 250.0, settlement: 403.6, recommendedPrepayment: 720,
  },
};

const TENANT_IDS = Object.keys(EXPECTED);
const EUR = 3;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const tenantById = (id: string) => TENANTS.find(t => t.id === id)!;

describe('Golden leap year 2023/24 — 366-day Abrechnung without mocks', () => {
  const wgFactors = computeWgFactorsByTenant(TENANTS, PERIOD.startdatum, PERIOD.enddatum);
  const results: Record<string, TenantCalculationResult> = Object.fromEntries(TENANTS.map(t => [
    t.id,
    calculateCompleteTenantResult(t, NEBENKOSTEN, TENANTS, METERS, READINGS, undefined, 'scheduled', RECHNUNGEN, wgFactors),
  ]));
  const tenantShare = (id: string, key: CostKey) =>
    results[id].operatingCosts.costItems.find(item => item.costName === COST_ITEMS[key].name)!.tenantShare;

  it('counts 366 days in the period', () => {
    expect(calculateTotalDays(PERIOD.startdatum, PERIOD.enddatum)).toBe(366);
  });

  describe('occupancy and WG day shares', () => {
    it.each(TENANT_IDS)('%s: occupied days, percentage of 366 days and share-days', id => {
      const occupancy = calculateOccupancyPercentage(tenantById(id), PERIOD.startdatum, PERIOD.enddatum);

      expect(occupancy.daysInPeriod).toBe(366);
      expect(occupancy.daysOccupied).toBe(EXPECTED[id].days);
      expect(occupancy.percentage).toBeCloseTo((EXPECTED[id].days / 366) * 100, 10);
      expect(wgFactors[id] * 366).toBeCloseTo(EXPECTED[id].shareDays, 8);
    });

    it('gives the leap day to exactly one tenant of the handover apartment', () => {
      expect(wgFactors['tenant-l2'] * 366 + wgFactors['tenant-l3'] * 366).toBeCloseTo(366, 8);
    });
  });

  describe('operating costs', () => {
    describe.each(COST_KEYS)('%s', key => {
      it.each(TENANT_IDS)('%s pays the hand-calculated share', id => {
        expect(tenantShare(id, key)).toBeCloseTo(EXPECTED[id].costs[key], EUR);
      });
    });

    it('bills the full cost of every area, tenant and apartment key: no apartment is vacant', () => {
      for (const key of ['grundsteuer', 'muell', 'hauswart'] as const) {
        expect(sum(TENANT_IDS.map(id => tenantShare(id, key)))).toBeCloseTo(COST_ITEMS[key].betrag, EUR);
      }
    });

    it('prorates nach Rechnung invoices by days out of 366 (183 × 229/366 + 73.2 × 137/366 = 141.90 €)', () => {
      expect(sum(TENANT_IDS.map(id => tenantShare(id, 'garten')))).toBeCloseTo(141.9, EUR);
    });
  });

  describe('meter costs', () => {
    it.each(TENANT_IDS)('%s: consumption and cost at 3 €/m³', id => {
      expect(results[id].meterCosts.tenantConsumption).toBeCloseTo(EXPECTED[id].m3, 4);
      expect(results[id].meterCosts.totalCost).toBeCloseTo(EXPECTED[id].meter, EUR);
    });
  });

  describe('prepayments', () => {
    it.each(TENANT_IDS)('%s: every month, including the partial edge months and February with 29 days', id => {
      const { monthlyPayments } = calculatePrepayments(tenantById(id), PERIOD.startdatum, PERIOD.enddatum);

      expect(monthlyPayments.map(m => m.month)).toEqual([
        '2023-07', '2023-08', '2023-09', '2023-10', '2023-11', '2023-12',
        '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07',
      ]);
      monthlyPayments.forEach((payment, i) => {
        expect(payment.amount).toBeCloseTo(EXPECTED[id].months[i], 5);
      });
      expect(results[id].prepayments.totalPrepayments).toBeCloseTo(EXPECTED[id].prepayments, EUR);
    });
  });

  describe('settlement', () => {
    it.each(TENANT_IDS)('%s: total costs, Nachzahlung and recommended prepayment', id => {
      expect(results[id].totalCosts).toBeCloseTo(EXPECTED[id].total, EUR);
      expect(results[id].finalSettlement).toBeCloseTo(EXPECTED[id].settlement, EUR);
      expect(results[id].recommendedPrepayment).toBe(EXPECTED[id].recommendedPrepayment);
    });

    it('adds up to the house summary', () => {
      const summary = calculateAbrechnungSummary(TENANTS, NEBENKOSTEN, METERS, READINGS, undefined, 'scheduled', RECHNUNGEN);

      expect(summary.totalAbrechnungVolumen).toBeCloseTo(7839.1, EUR);
      expect(summary.totalVorauszahlungen).toBeCloseTo(3359.377086, EUR);
      expect(summary.totalBalance).toBeCloseTo(4479.722914, EUR);
    });
  });
});
