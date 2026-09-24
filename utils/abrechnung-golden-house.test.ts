/**
 * Golden end-to-end test of the Betriebskostenabrechnung.
 *
 * One fictional house (utils/__fixtures__/golden-house-2025.fixture.ts) runs through the real
 * calculation chain — occupancy → WG day shares → cost distribution → meter costs →
 * prepayments → settlement — with nothing mocked. Every expected value was calculated
 * by hand, independently of the code; the derivation is in the Notion page
 * "RMS Golden house 2025: hand calculation" (https://app.notion.com/p/3e581e55ec3c81f7b53fcd426fb35061).
 *
 * Expected values are literal numbers, never formulas copied from the implementation.
 * Money is asserted to within 0.0005 € (toBeCloseTo(x, 3)), well below one cent, and water
 * volumes to within 0.00005 m³ (toBeCloseTo(x, 4)). The code rounds allocated m³ to 5 decimals,
 * so thirds of a reading (apt-201) differ from the exact values by up to 0.00005 € — keep the
 * tolerances at least this loose.
 */
import {
  calculateAbrechnungSummary,
  calculateCompleteTenantResult,
  calculateOccupancyPercentage,
  calculatePrepayments,
  validateCalculationData,
} from './abrechnung-calculations';
import { calculateTenantMeterCosts } from './water-cost-calculations';
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
  PERIOD,
  READINGS,
  RECHNUNGEN,
  TENANTS,
} from './__fixtures__/golden-house-2025.fixture';

type Expected = {
  /** Days the tenant lived in the apartment during the period */
  days: number;
  /** Days weighted by the number of flatmates present each day (WG factor × 365) */
  shareDays: number;
  costs: Record<CostKey, number>;
  operating: number;
  kaltwasserM3: number;
  warmwasserM3: number;
  meter: number;
  total: number;
  prepayments: number;
  missingScheduleMonths?: number;
  settlement: number;
  recommendedPrepayment: number;
};

// Hand-calculated results (see the Notion page linked above for every formula)
const EXPECTED: Record<string, Expected> = {
  'tenant-a': {
    days: 212, shareDays: 212,
    costs: { grundsteuer: 265.0, versicherung: 72.60274, muell: 212.0, hauswart: 212.0, garten: 84.8 },
    operating: 846.40274, kaltwasserM3: 42.4, warmwasserM3: 21.2, meter: 360.4, total: 1206.80274,
    prepayments: 400.0, settlement: 806.80274, recommendedPrepayment: 1320,
  },
  'tenant-b': {
    days: 153, shareDays: 153,
    costs: { grundsteuer: 191.25, versicherung: 52.39726, muell: 153.0, hauswart: 153.0, garten: 0 },
    operating: 549.64726, kaltwasserM3: 30.6, warmwasserM3: 15.3, meter: 260.1, total: 809.74726,
    prepayments: 350.0, settlement: 459.74726, recommendedPrepayment: 900,
  },
  'tenant-c': {
    days: 135, shareDays: 135,
    costs: { grundsteuer: 135.0, versicherung: 36.986301, muell: 135.0, hauswart: 135.0, garten: 0 },
    operating: 441.986301, kaltwasserM3: 27.0, warmwasserM3: 6.75, meter: 168.75, total: 610.736301,
    prepayments: 201.774194, settlement: 408.962108, recommendedPrepayment: 660,
  },
  'tenant-d': {
    days: 214, shareDays: 214,
    costs: { grundsteuer: 214.0, versicherung: 58.630137, muell: 214.0, hauswart: 214.0, garten: 42.8 },
    operating: 743.430137, kaltwasserM3: 21.4, warmwasserM3: 10.7, meter: 181.9, total: 925.330137,
    prepayments: 385.0, settlement: 540.330137, recommendedPrepayment: 1020,
  },
  'tenant-wg1': {
    days: 261, shareDays: 97.666667,
    costs: { grundsteuer: 293.0, versicherung: 80.273973, muell: 261.0, hauswart: 97.666667, garten: 78.3 },
    operating: 810.240639, kaltwasserM3: 19.533333, warmwasserM3: 9.766667, meter: 166.033333, total: 976.273973,
    prepayments: 682.666667, settlement: 293.607306, recommendedPrepayment: 1080,
  },
  'tenant-wg2': {
    days: 245, shareDays: 81.666667,
    costs: { grundsteuer: 245.0, versicherung: 67.123288, muell: 245.0, hauswart: 81.666667, garten: 0 },
    operating: 638.789954, kaltwasserM3: 16.333333, warmwasserM3: 8.166667, meter: 138.833333, total: 777.623288,
    prepayments: 520.0, settlement: 257.623288, recommendedPrepayment: 840,
  },
  'tenant-wg3': {
    days: 245, shareDays: 81.666667,
    costs: { grundsteuer: 245.0, versicherung: 67.123288, muell: 245.0, hauswart: 81.666667, garten: 0 },
    operating: 638.789954, kaltwasserM3: 16.333333, warmwasserM3: 8.166667, meter: 138.833333, total: 777.623288,
    prepayments: 0, missingScheduleMonths: 8, settlement: 777.623288, recommendedPrepayment: 840,
  },
  'tenant-wg4': {
    days: 365, shareDays: 197.5,
    costs: { grundsteuer: 444.375, versicherung: 121.746575, muell: 365.0, hauswart: 197.5, garten: 36.5 },
    operating: 1165.121575, kaltwasserM3: 39.5, warmwasserM3: 19.75, meter: 335.75, total: 1500.871575,
    prepayments: 1160.0, settlement: 340.871575, recommendedPrepayment: 1680,
  },
  'tenant-wg5': {
    days: 90, shareDays: 45,
    costs: { grundsteuer: 101.25, versicherung: 27.739726, muell: 90.0, hauswart: 45.0, garten: 0 },
    operating: 263.989726, kaltwasserM3: 9.0, warmwasserM3: 4.5, meter: 76.5, total: 340.489726,
    prepayments: 270.0, settlement: 70.489726, recommendedPrepayment: 360,
  },
  'tenant-wg6': {
    days: 245, shareDays: 122.5,
    costs: { grundsteuer: 275.625, versicherung: 75.513699, muell: 245.0, hauswart: 122.5, garten: 0 },
    operating: 718.638699, kaltwasserM3: 24.5, warmwasserM3: 12.25, meter: 208.25, total: 926.888699,
    prepayments: 800.0, settlement: 126.888699, recommendedPrepayment: 1020,
  },
  'tenant-s': {
    days: 365, shareDays: 365,
    costs: { grundsteuer: 365.0, versicherung: 100.0, muell: 365.0, hauswart: 365.0, garten: 60.0 },
    operating: 1255.0, kaltwasserM3: 45.0, warmwasserM3: 20.0, meter: 360.0, total: 1615.0,
    prepayments: 900.0, settlement: 715.0, recommendedPrepayment: 1800,
  },
};

const TENANT_IDS = Object.keys(EXPECTED);
const EUR = 3; // decimal places for toBeCloseTo on money: |diff| < 0.0005 €

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function calculateAll(tenants = TENANTS): Record<string, TenantCalculationResult> {
  const wgFactors = computeWgFactorsByTenant(tenants, PERIOD.startdatum, PERIOD.enddatum);
  return Object.fromEntries(tenants.map(t => [
    t.id,
    calculateCompleteTenantResult(t, NEBENKOSTEN, tenants, METERS, READINGS, undefined, 'scheduled', RECHNUNGEN, wgFactors),
  ]));
}

const tenantShare = (result: TenantCalculationResult, key: CostKey) =>
  result.operatingCosts.costItems.find(item => item.costName === COST_ITEMS[key].name)!.tenantShare;

describe('Golden house 2025 — full Abrechnung without mocks', () => {
  const results = calculateAll();

  describe('fixture', () => {
    it('is a consistent house: 6 apartments with 400 m² and no validation findings', () => {
      expect(sum(Object.values(APARTMENTS).map(a => a.groesse))).toBe(HOUSE.area);
      expect(Object.keys(APARTMENTS)).toHaveLength(HOUSE.apartmentCount);
      expect(TENANT_IDS.sort()).toEqual(TENANTS.map(t => t.id).sort());

      expect(validateCalculationData(NEBENKOSTEN, TENANTS, METERS, READINGS)).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });
    });
  });

  describe('occupancy', () => {
    it.each(TENANT_IDS)('%s: occupied days and percentage of the 365-day period', id => {
      const tenant = TENANTS.find(t => t.id === id)!;
      const occupancy = calculateOccupancyPercentage(tenant, PERIOD.startdatum, PERIOD.enddatum);

      expect(occupancy.daysInPeriod).toBe(365);
      expect(occupancy.daysOccupied).toBe(EXPECTED[id].days);
      expect(occupancy.percentage).toBeCloseTo((EXPECTED[id].days / 365) * 100, 10);
    });

    it('clips the effective period to move-in and move-out inside the period', () => {
      const byId = (id: string) =>
        calculateOccupancyPercentage(TENANTS.find(t => t.id === id)!, PERIOD.startdatum, PERIOD.enddatum);

      expect(byId('tenant-a')).toMatchObject({ effectivePeriodStart: '2025-01-01', effectivePeriodEnd: '2025-07-31' });
      expect(byId('tenant-b')).toMatchObject({ effectivePeriodStart: '2025-08-01', effectivePeriodEnd: '2025-12-31' });
      expect(byId('tenant-c')).toMatchObject({ effectivePeriodStart: '2025-01-01', effectivePeriodEnd: '2025-05-15' });
      expect(byId('tenant-wg1')).toMatchObject({ effectivePeriodStart: '2025-04-15', effectivePeriodEnd: '2025-12-31' });
      expect(byId('tenant-wg5')).toMatchObject({ effectivePeriodStart: '2025-01-01', effectivePeriodEnd: '2025-03-31' });
    });
  });

  describe('WG day shares', () => {
    const factors = computeWgFactorsByTenant(TENANTS, PERIOD.startdatum, PERIOD.enddatum);

    it.each(TENANT_IDS)('%s: share-days = WG factor × 365', id => {
      expect(factors[id] * 365).toBeCloseTo(EXPECTED[id].shareDays, 5);
    });

    it('gives every apartment at most its occupied days, never more than 365', () => {
      const apartmentShareDays = (ids: string[]) => sum(ids.map(id => factors[id] * 365));

      expect(apartmentShareDays(['tenant-a', 'tenant-b'])).toBeCloseTo(365, 8); // seamless handover
      expect(apartmentShareDays(['tenant-c', 'tenant-d'])).toBeCloseTo(349, 8); // 16 vacant days
      expect(apartmentShareDays(['tenant-wg1', 'tenant-wg2', 'tenant-wg3'])).toBeCloseTo(261, 8); // 104 vacant days
      expect(apartmentShareDays(['tenant-wg4', 'tenant-wg5', 'tenant-wg6'])).toBeCloseTo(365, 8); // never empty
    });
  });

  describe('operating costs per cost item', () => {
    describe.each(COST_KEYS)('%s', key => {
      it.each(TENANT_IDS)(`%s pays the hand-calculated share`, id => {
        expect(tenantShare(results[id], key)).toBeCloseTo(EXPECTED[id].costs[key], EUR);
      });
    });

    it('bills pro Fläche (Grundsteuer 3,650 €) at 0.025 €/m²/day and leaves 875.50 € of vacancy with the landlord', () => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'grundsteuer')));
      // Vacancy: apt-301 60 m² × 365 d (547.50) + apt-102 40 m² × 16 d (16.00) + apt-201 120 m² × 104 d (312.00)
      expect(billed).toBeCloseTo(2774.5, EUR);
      expect(COST_ITEMS.grundsteuer.betrag - billed).toBeCloseTo(875.5, EUR);
    });

    it('bills pro Fläche at an uneven rate (Gebäudeversicherung 1,000 €) without drifting', () => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'versicherung')));
      // 1000 × (2774.5 / 3650) — the same area-days as the Grundsteuer
      expect(billed).toBeCloseTo(760.136986, EUR);
    });

    it('distributes pro Mieter (Müllabfuhr 2,530 €) completely over 2,530 person-days', () => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'muell')));
      expect(billed).toBeCloseTo(2530, EUR);
    });

    it('bills pro Wohnung (Hauswart 2,190 €) at 1 €/apartment-day over all 6 apartments', () => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'hauswart')));
      // Landlord: apt-301 365 d + apt-102 16 d + apt-201 104 d = 485 €
      expect(billed).toBeCloseTo(1705, EUR);
      expect(COST_ITEMS.hauswart.betrag - billed).toBeCloseTo(485, EUR);
    });

    it('bills nach Rechnung (Gartenpflege) from each tenant\'s own invoice, prorated by occupancy', () => {
      const billed = sum(TENANT_IDS.map(id => tenantShare(results[id], 'garten')));
      // 146 × 212/365 + 73 × 214/365 + 109.5 × 261/365 + 60 + 36.5 = 302.40 (B's "Winterdienst" row is not Gartenpflege)
      expect(billed).toBeCloseTo(302.4, EUR);
    });

    it('shows every tenant the same house-wide €/m² rate, WG members included', () => {
      for (const id of TENANT_IDS) {
        const items = results[id].operatingCosts.costItems;
        const grundsteuer = items.find(i => i.costName === 'Grundsteuer')!;
        const versicherung = items.find(i => i.costName === 'Gebäudeversicherung')!;

        expect(grundsteuer.pricePerSqm).toBe(9.125); // 3650 / 400
        expect(versicherung.pricePerSqm).toBe(2.5); // 1000 / 400
        expect(grundsteuer.distributionBasis).toBe('400 m²');
      }
    });

    it.each(TENANT_IDS)('%s: operating cost total', id => {
      expect(results[id].operatingCosts.totalCost).toBeCloseTo(EXPECTED[id].operating, EUR);
    });

    it('accounts for every euro: billed to tenants + left over = the 9,795 € of cost items', () => {
      const leftOver = (key: CostKey) => COST_ITEMS[key].betrag - sum(TENANT_IDS.map(id => tenantShare(results[id], key)));

      expect(leftOver('grundsteuer')).toBeCloseTo(875.5, EUR); // vacancy
      expect(leftOver('versicherung')).toBeCloseTo(239.863014, EUR); // vacancy
      expect(leftOver('muell')).toBeCloseTo(0, EUR); // pro Mieter bills everything
      expect(leftOver('hauswart')).toBeCloseTo(485, EUR); // vacancy
      expect(leftOver('garten')).toBeCloseTo(122.6, EUR); // invoices prorated by occupancy

      const billed = sum(TENANT_IDS.map(id => results[id].operatingCosts.totalCost));
      expect(billed).toBeCloseTo(8072.036986, EUR);
      expect(sum(COST_KEYS.map(leftOver))).toBeCloseTo(1722.963014, EUR);
    });
  });

  describe('meter costs', () => {
    const meterCosts = calculateTenantMeterCosts(
      TENANTS, METERS, READINGS,
      NEBENKOSTEN.zaehlerkosten!, NEBENKOSTEN.zaehlerverbrauch!,
      PERIOD.startdatum, PERIOD.enddatum
    );
    const byId = (id: string) => meterCosts.find(m => m.tenantId === id)!;

    it('prices each meter type separately: 4 €/m³ cold, 9 €/m³ warm water', () => {
      expect(byId('tenant-s').pricePerUnitByType).toEqual({ kaltwasser: 4, warmwasser: 9 });
    });

    it.each(TENANT_IDS)('%s: consumption per type and meter cost', id => {
      const cost = byId(id);
      expect(cost.consumptionByType.kaltwasser).toBeCloseTo(EXPECTED[id].kaltwasserM3, 4);
      expect(cost.consumptionByType.warmwasser).toBeCloseTo(EXPECTED[id].warmwasserM3, 4);
      expect(cost.costShare).toBeCloseTo(EXPECTED[id].meter, EUR);
      expect(results[id].meterCosts.totalCost).toBeCloseTo(EXPECTED[id].meter, EUR);
    });

    it('bills no tenant for water used while an apartment was empty', () => {
      const billed = (type: 'kaltwasser' | 'warmwasser') =>
        sum(meterCosts.map(m => m.consumptionByType[type] || 0));

      // Readings in the period: 315.5 m³ cold, 147.75 m³ warm.
      // Vacant: apt-102 1.6 + apt-201 20.8 + apt-301 1.5 = 23.9 m³ cold; apt-102 0.8 + apt-201 10.4 = 11.2 m³ warm.
      // The November 2024 reading of kw-302 (99 m³) lies outside the period.
      expect(billed('kaltwasser')).toBeCloseTo(291.6, 4);
      expect(billed('warmwasser')).toBeCloseTo(136.55, 4);
      expect(meterCosts.find(m => m.apartmentId === 'apt-301')).toBeUndefined();
    });

    it('accounts for every euro of water: billed to tenants + not billed = 2,630 €', () => {
      const billed = sum(meterCosts.map(m => m.costShare));
      const buildingCost = NEBENKOSTEN.zaehlerkosten!.kaltwasser + NEBENKOSTEN.zaehlerkosten!.warmwasser;

      // Not billed: 28.4 m³ cold × 4 € + 13.45 m³ warm × 9 € (vacancy plus shared use at the main meter)
      expect(billed).toBeCloseTo(2395.35, EUR);
      expect(buildingCost - billed).toBeCloseTo(234.65, EUR);
    });

    it('marks WG and sequential tenants as sharing an apartment', () => {
      expect(byId('tenant-s').isWGMember).toBe(false);
      expect(byId('tenant-wg1').isWGMember).toBe(true);
      expect(byId('tenant-a').isWGMember).toBe(true);
      expect(byId('tenant-wg1').wgSplitDetails!.coTenants.map(c => c.tenantId).sort()).toEqual(['tenant-wg2', 'tenant-wg3']);
    });

    it('reports the building meter totals for water only', () => {
      expect(results['tenant-s'].meterCosts.totalBuildingMeterCost).toBe(2630);
      expect(results['tenant-s'].meterCosts.totalBuildingConsumption).toBe(470);
    });
  });

  describe('prepayments (scheduled / Soll)', () => {
    it.each(TENANT_IDS)('%s: total prepayments', id => {
      expect(results[id].prepayments.totalPrepayments).toBeCloseTo(EXPECTED[id].prepayments, EUR);
      expect(results[id].prepayments.missingScheduleMonths).toBe(EXPECTED[id].missingScheduleMonths);
    });

    const monthAmounts = (id: string) => {
      const tenant = TENANTS.find(t => t.id === id)!;
      return calculatePrepayments(tenant, PERIOD.startdatum, PERIOD.enddatum).monthlyPayments.map(m => m.amount);
    };

    it('applies a schedule change from March on (tenant A: 50 € → 60 €) and stops after move-out', () => {
      expect(monthAmounts('tenant-a')).toEqual([50, 50, 60, 60, 60, 60, 60, 0, 0, 0, 0, 0]);
    });

    it('prorates the move-out month by days (tenant C: 45 € × 15/31 in May)', () => {
      const months = monthAmounts('tenant-c');
      expect(months.slice(0, 4)).toEqual([45, 45, 45, 45]);
      expect(months[4]).toBeCloseTo(21.774194, 5);
      expect(months.slice(5)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('prorates the move-in month by days (WG1: 80 € × 16/30 in April)', () => {
      const months = monthAmounts('tenant-wg1');
      expect(months.slice(0, 3)).toEqual([0, 0, 0]);
      expect(months[3]).toBeCloseTo(42.666667, 5);
      expect(months.slice(4)).toEqual([80, 80, 80, 80, 80, 80, 80, 80]);
    });

    it('ignores schedule entries dated after the period (tenant S: 85 € from 2026)', () => {
      expect(monthAmounts('tenant-s')).toEqual(Array(12).fill(75));
    });
  });

  describe('settlement', () => {
    it.each(TENANT_IDS)('%s: total costs, Nachzahlung/Guthaben and recommended prepayment', id => {
      const result = results[id];
      expect(result.totalCosts).toBeCloseTo(EXPECTED[id].total, EUR);
      expect(result.finalSettlement).toBeCloseTo(EXPECTED[id].settlement, EUR);
      expect(result.recommendedPrepayment).toBe(EXPECTED[id].recommendedPrepayment);
    });

    it('adds up to the house summary', () => {
      const summary = calculateAbrechnungSummary(TENANTS, NEBENKOSTEN, METERS, READINGS, undefined, 'scheduled', RECHNUNGEN);

      expect(summary.totalAbrechnungVolumen).toBeCloseTo(10467.386986, EUR);
      expect(summary.totalVorauszahlungen).toBeCloseTo(5669.44086, EUR);
      expect(summary.totalBalance).toBeCloseTo(4797.946126, EUR);
    });
  });

  describe('invariants', () => {
    it('does not depend on the order of the tenants', () => {
      const reversed = calculateAll([...TENANTS].reverse());
      for (const id of TENANT_IDS) {
        expect(reversed[id].totalCosts).toBeCloseTo(results[id].totalCosts, 10);
        expect(reversed[id].finalSettlement).toBeCloseTo(results[id].finalSettlement, 10);
      }
    });

    it('gives the same result with and without precomputed WG factors', () => {
      for (const tenant of TENANTS) {
        const fresh = calculateCompleteTenantResult(tenant, NEBENKOSTEN, TENANTS, METERS, READINGS, undefined, 'scheduled', RECHNUNGEN);
        expect(fresh.totalCosts).toBeCloseTo(results[tenant.id].totalCosts, 10);
      }
    });
  });

  describe('prepayments (actual payments / Ist)', () => {
    const actual = (id: string) => {
      const tenant = TENANTS.find(t => t.id === id)!;
      return calculateCompleteTenantResult(tenant, NEBENKOSTEN, TENANTS, METERS, READINGS, ACTUAL_PAYMENTS, 'actual', RECHNUNGEN)
        .prepayments.totalPrepayments;
    };

    it('counts payments on both period boundaries but not one day outside (tenant S: 12 × 75 €)', () => {
      expect(actual('tenant-s')).toBeCloseTo(900, EUR);
    });

    // KNOWN BUG: actual payments are matched by apartment only, so every tenant of apt-101 is
    // credited with all 750 € paid into that apartment — A gets B's payments and vice versa.
    // When this starts passing, the bug is fixed: turn it.failing into it.
    it.failing('credits each payment to only one tenant after a handover (A: 400 €, B: 350 €)', () => {
      expect(actual('tenant-a')).toBeCloseTo(400, EUR);
      expect(actual('tenant-b')).toBeCloseTo(350, EUR);
    });
  });
});
