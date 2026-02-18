
import {
  calculateOccupancyPercentage,
  calculateTenantCosts,
  calculatePrepayments,
  validateCalculationData,
  calculateMeterCostDistribution,
  calculateRecommendedPrepayment,
  formatCurrency,
  calculateCompleteTenantResult
} from './abrechnung-calculations';
import type { Finanzen } from '@/lib/types';
import { calculateTenantOccupancy } from './date-calculations';
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution
} from './cost-calculations';
import { getTenantMeterCost } from './water-cost-calculations';

// Mock dependencies
jest.mock('./date-calculations', () => ({
  calculateTenantOccupancy: jest.fn()
}));

jest.mock('./cost-calculations', () => ({
  calculateProFlächeDistribution: jest.fn(),
  calculateProMieterDistribution: jest.fn(),
  calculateProWohnungDistribution: jest.fn(),
  calculateNachRechnungDistribution: jest.fn(),
  calculateMeterCostDistribution: jest.fn()
}));

jest.mock('./water-cost-calculations', () => ({
  getTenantMeterCost: jest.fn()
}));

describe('abrechnung-calculations', () => {
  const startdatum = '2023-01-01';
  const enddatum = '2023-12-31';
  const mockTenant = {
    id: 't1',
    name: 'Max',
    Wohnungen: { groesse: 50, name: 'Apt 1' },
    einzug: '2023-01-01',
    auszug: null,
    wohnung_id: 'w1'
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (calculateTenantOccupancy as jest.Mock).mockReturnValue({
      occupancyRatio: 1,
      occupancyDays: 365,
      tenantId: 't1'
    });
  });

  describe('calculateOccupancyPercentage', () => {
    it('returns correct occupancy calculation', () => {
      const result = calculateOccupancyPercentage(mockTenant, startdatum, enddatum);

      expect(result.percentage).toBe(100);
      expect(result.daysOccupied).toBe(365);
      expect(result.daysInPeriod).toBe(365);
    });
  });

  describe('calculateTenantCosts', () => {
    it('calculates costs for different calculation types', () => {
      const nebenkosten = {
        nebenkostenart: ['Hausmeister', 'Müll', 'Lift'],
        betrag: [1000, 2000, 3000],
        berechnungsart: ['pro Fläche', 'pro Mieter', 'pro Wohnung'],
        startdatum,
        enddatum
      } as any;

      // Mock the distributions
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 500 } });
      (calculateProMieterDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 1000 } });
      (calculateProWohnungDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 1500 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);

      expect(result.totalCost).toBe(500 + 1000 + 1500);
      expect(result.costItems).toHaveLength(3);
      expect(result.costItems[0].tenantShare).toBe(500);
      expect(result.costItems[1].tenantShare).toBe(1000);
      expect(result.costItems[2].tenantShare).toBe(1500);
    });

    it('defaults to pro Fläche for unknown type', () => {
      const nebenkosten = {
        nebenkostenart: ['Unknown'],
        betrag: [100],
        berechnungsart: ['unknown'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 50 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);
      expect(result.costItems[0].calculationType).toBe('unknown');
      expect(calculateProFlächeDistribution).toHaveBeenCalled();
    });

    it('handles nach Rechnung type', () => {
      const nebenkosten = {
        nebenkostenart: ['Special'],
        betrag: [100],
        berechnungsart: ['nach Rechnung'],
        startdatum,
        enddatum
      } as any;

      const result = calculateTenantCosts(mockTenant, nebenkosten);
      expect(result.costItems[0].calculationType).toBe('nach Rechnung');
      expect(result.costItems[0].tenantShare).toBe(100); // 100% occupancy
    });
  });

  describe('calculatePrepayments — scheduled mode', () => {
    it('returns 0 and reports missingScheduleMonths when no nebenkosten schedule exists', () => {
      // mockTenant has no nebenkosten array — all occupied months should be flagged
      const result = calculatePrepayments(mockTenant, startdatum, enddatum);

      expect(result.monthlyPayments).toHaveLength(12);
      expect(result.totalPrepayments).toBe(0);
      expect(result.averageMonthlyPayment).toBe(0);
      expect(result.missingScheduleMonths).toBe(12);
    });

    it('does NOT set missingScheduleMonths when schedule data is present for all months', () => {
      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '150' }]
      } as any;

      const result = calculatePrepayments(tenantWithSchedule, startdatum, enddatum);

      expect(result.totalPrepayments).toBe(12 * 150); // 150/month * 12 months * ratio 1
      expect(result.missingScheduleMonths).toBeUndefined();
    });

    it('prorates prepayment by occupancy ratio', () => {
      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '200' }]
      } as any;

      // Mock half-month occupancy
      (calculateTenantOccupancy as jest.Mock).mockReturnValue({
        occupancyRatio: 0.5,
        occupancyDays: 15,
        tenantId: 't1'
      });

      const result = calculatePrepayments(tenantWithSchedule, startdatum, enddatum);

      // Each month should be 200 * 0.5 = 100
      expect(result.monthlyPayments[0].amount).toBe(100);
    });

    it('does not set missingScheduleMonths when tenant is not occupying in a month', () => {
      // Zero occupancy days — not occupied, so no missing data expected
      (calculateTenantOccupancy as jest.Mock).mockReturnValue({
        occupancyRatio: 0,
        occupancyDays: 0,
        tenantId: 't1'
      });

      const result = calculatePrepayments(mockTenant, startdatum, enddatum);

      expect(result.totalPrepayments).toBe(0);
      // Not occupied, so no "missing" data — missingScheduleMonths should be 0 or undefined
      expect(result.missingScheduleMonths ?? 0).toBe(0);
    });
  });

  describe('calculatePrepayments — actual mode', () => {
    const makePayment = (datum: string, betrag: number, wohnungId = 'w1'): Finanzen =>
      ({
        id: `pay-${datum}`,
        wohnung_id: wohnungId,
        datum,
        betrag,
        ist_einnahmen: true,
        name: 'Nebenkosten',
        notiz: null,
        user_id: 'u1',
        dokument_id: null,
        tags: ['Nebenkosten']
      } as Finanzen);

    it('sums actual payments within each month', () => {
      const actualPayments: Finanzen[] = [
        makePayment('2023-01-10', 150),
        makePayment('2023-02-10', 150),
        makePayment('2023-03-10', 150),
      ];

      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-03-31', actualPayments, 'actual');

      expect(result.totalPrepayments).toBe(450);
      expect(result.monthlyPayments[0].amount).toBe(150);
      expect(result.monthlyPayments[1].amount).toBe(150);
      expect(result.monthlyPayments[2].amount).toBe(150);
    });

    it('returns 0 for months with no actual payment entries — does NOT set missingScheduleMonths', () => {
      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-03-31', [], 'actual');

      expect(result.totalPrepayments).toBe(0);
      // missingScheduleMonths only applies to 'scheduled' mode
      expect(result.missingScheduleMonths).toBeUndefined();
    });

    it('sums multiple payments in the same month', () => {
      const actualPayments: Finanzen[] = [
        makePayment('2023-01-05', 100),
        makePayment('2023-01-20', 75),
      ];

      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-01-31', actualPayments, 'actual');

      expect(result.totalPrepayments).toBe(175);
      expect(result.monthlyPayments[0].amount).toBe(175);
    });

    it('ignores payments outside the billing period', () => {
      const actualPayments: Finanzen[] = [
        makePayment('2022-12-31', 200), // Before billing period
        makePayment('2023-01-15', 150), // Inside
        makePayment('2024-01-01', 200), // After billing period
      ];

      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-01-31', actualPayments, 'actual');

      expect(result.totalPrepayments).toBe(150); // Only the in-period payment
    });

    it('handles actualPayments being undefined gracefully', () => {
      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-01-31', undefined, 'actual');

      expect(result.totalPrepayments).toBe(0);
    });
  });

  describe('calculateCompleteTenantResult — prepaymentMode', () => {
    const makePayment = (datum: string, betrag: number, wohnungId = 'w1'): Finanzen =>
      ({
        id: `pay-${datum}`,
        wohnung_id: wohnungId,
        datum,
        betrag,
        ist_einnahmen: true,
        name: 'Nebenkosten',
        notiz: null,
        user_id: 'u1',
        dokument_id: null,
        tags: ['Nebenkosten']
      } as Finanzen);

    beforeEach(() => {
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);
    });

    it('uses actual payments when prepaymentMode is actual', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum: '2023-01-01',
        enddatum: '2023-01-31'
      } as any;

      const actualPayments: Finanzen[] = [makePayment('2023-01-10', 80)];

      const result = calculateCompleteTenantResult(
        mockTenant,
        nebenkosten,
        [mockTenant],
        [],
        [],
        actualPayments,
        'actual'
      );

      expect(result.prepayments.totalPrepayments).toBe(80);
      // finalSettlement = totalCosts - prepayments = 100 - 80 = 20
      expect(result.finalSettlement).toBe(20);
    });

    it('defaults to scheduled mode when no prepaymentMode passed', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum: '2023-01-01',
        enddatum: '2023-01-31'
      } as any;

      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '120' }]
      } as any;

      const result = calculateCompleteTenantResult(tenantWithSchedule, nebenkosten, [tenantWithSchedule], [], []);

      expect(result.prepayments.totalPrepayments).toBe(120);
    });

    it('pre-filters actualPayments by wohnung_id before passing to calculatePrepayments', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [0],
        berechnungsart: ['pro Fläche'],
        startdatum: '2023-01-01',
        enddatum: '2023-01-31'
      } as any;
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 0 } });

      // Mix of payments for different apartments
      const actualPayments: Finanzen[] = [
        makePayment('2023-01-10', 100, 'w1'), // belongs to mockTenant
        makePayment('2023-01-10', 200, 'w2'), // different apartment
        makePayment('2023-01-15', 50, 'w1'),  // belongs to mockTenant
      ];

      const result = calculateCompleteTenantResult(
        mockTenant,
        nebenkosten,
        [mockTenant],
        [],
        [],
        actualPayments,
        'actual'
      );

      // Only payments for w1 should be counted: 100 + 50 = 150
      expect(result.prepayments.totalPrepayments).toBe(150);
    });
  });

  describe('validateCalculationData', () => {
    it('returns valid for correct data', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [100]
      } as any;

      const result = validateCalculationData(nebenkosten, [mockTenant]);
      expect(result.isValid).toBe(true);
    });

    it('detects missing dates', () => {
      const nebenkosten = { nebenkostenart: ['Test'], betrag: [100] } as any;
      const result = validateCalculationData(nebenkosten, [mockTenant]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start- und Enddatum sind erforderlich');
    });

    it('detects mismatched arrays', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [] // Empty
      } as any;

      const result = validateCalculationData(nebenkosten, [mockTenant]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Anzahl der Nebenkostenarten muss mit Anzahl der Beträge übereinstimmen');
    });

    it('warns about missing tenant data', () => {
      const badTenant = { ...mockTenant, einzug: null, Wohnungen: { groesse: 0 } };
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [100]
      } as any;

      const result = validateCalculationData(nebenkosten, [badTenant]);
      expect(result.warnings.some(w => w.includes('Einzugsdatum'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Wohnungsgröße'))).toBe(true);
    });

    it('validates water meter data when water costs present', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [100],
        zaehlerkosten: { kaltwasser: 100 }
      } as any;

      // Case 1: No meters
      let result = validateCalculationData(nebenkosten, [mockTenant], [], []);
      expect(result.warnings).toContain('Wasserkosten sind angegeben, aber keine Wasserzähler vorhanden');

      // Case 2: Meters but no readings
      const mockMeter = { id: 'm1', wohnung_id: 'w1' } as any;
      result = validateCalculationData(nebenkosten, [mockTenant], [mockMeter], []);
      expect(result.warnings).toContain('Wasserzähler vorhanden, aber keine Ablesungen für den Abrechnungszeitraum');

      // Case 3: Missing meter for apartment
      const tenantWithoutMeter = { ...mockTenant, wohnung_id: 'w2' };
      result = validateCalculationData(nebenkosten, [tenantWithoutMeter], [mockMeter], [{ zaehler_id: 'm1', ablese_datum: '2023-06-01' }] as any);
      expect(result.warnings.some(w => w.includes('Wohnung w2: Keine Wasserzähler'))).toBe(true);
    });
  });

  describe('calculateMeterCostDistribution', () => {
    it('returns zero cost if no tenant meter cost calculated', () => {
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);
      const result = calculateMeterCostDistribution(mockTenant, {} as any, [], [], []);
      expect(result.totalCost).toBe(0);
    });

    it('returns calculated cost with meter reading', () => {
      (getTenantMeterCost as jest.Mock).mockReturnValue({
        consumption: 10,
        costShare: 50,
        pricePerUnit: 5
      });

      const waterMeters = [{ id: 'm1', wohnung_id: 'w1' }] as any;
      const waterReadings = [{ zaehler_id: 'm1', zaehlerstand: 100, ablese_datum: '2023-06-01' }] as any;
      const nebenkosten = { startdatum, enddatum, zaehlerkosten: { kaltwasser: 100 }, zaehlerverbrauch: { kaltwasser: 20 } } as any;

      const result = calculateMeterCostDistribution(mockTenant, nebenkosten, [], waterMeters, waterReadings);

      expect(result.totalCost).toBe(50);
      expect(result.meterReading?.currentReading).toBe(100);
    });
  });

  describe('calculateRecommendedPrepayment', () => {
    it('calculates with buffer and rounding', () => {
      const tenantCalc = { totalCosts: 1200 } as any;
      const result = calculateRecommendedPrepayment(tenantCalc);
      // 1200 * 1.1 = 1320
      // 1320 / 12 = 110
      // Round to nearest 5 -> 110
      // 110 * 12 = 1320
      expect(result).toBe(1320);
    });

    it('returns 0 for zero costs', () => {
      expect(calculateRecommendedPrepayment({ totalCosts: 0 } as any)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('formats correctly', () => {
      const formatted = formatCurrency(123.45);
      expect(formatted).toMatch(/123(,|.)45/);
      expect(formatted).toContain('€');
    });
  });

  describe('calculateCompleteTenantResult', () => {
    it('aggregates all calculations', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);

      // Provide a prepayment schedule so the result is deterministic
      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '50' }]
      } as any;

      const result = calculateCompleteTenantResult(tenantWithSchedule, nebenkosten, [], [], []);

      expect(result.operatingCosts.totalCost).toBe(100);
      expect(result.meterCosts.totalCost).toBe(0);
      // 12 months * 50€ schedule
      expect(result.prepayments.totalPrepayments).toBe(600);
      expect(result.finalSettlement).toBe(100 - 600); // costs − prepayments
      expect(result.prepayments.missingScheduleMonths).toBeUndefined();
    });

    it('surfaces missingScheduleMonths when tenant has no prepayment schedule', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);

      const result = calculateCompleteTenantResult(mockTenant, nebenkosten, [], [], []);

      expect(result.operatingCosts.totalCost).toBe(100);
      expect(result.prepayments.totalPrepayments).toBe(0);
      expect(result.prepayments.missingScheduleMonths).toBe(12);
    });
  });
});
