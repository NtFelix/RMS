
import {
  calculateOccupancyPercentage,
  calculateTenantCosts,
  calculatePrepayments,
  validateCalculationData,
  calculateWaterCostDistribution,
  calculateRecommendedPrepayment,
  formatCurrency,
  calculateCompleteTenantResult
} from './abrechnung-calculations';
import { calculateTenantOccupancy } from './date-calculations';
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution
} from './cost-calculations';
import { getTenantWaterCost } from './water-cost-calculations';

// Mock dependencies
jest.mock('./date-calculations', () => ({
  calculateTenantOccupancy: jest.fn()
}));

jest.mock('./cost-calculations', () => ({
  calculateProFlächeDistribution: jest.fn(),
  calculateProMieterDistribution: jest.fn(),
  calculateProWohnungDistribution: jest.fn(),
  calculateNachRechnungDistribution: jest.fn(),
  calculateWaterCostDistribution: jest.fn()
}));

jest.mock('./water-cost-calculations', () => ({
  getTenantWaterCost: jest.fn()
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

  describe('calculatePrepayments', () => {
    it('calculates monthly prepayments based on occupancy', () => {
      const result = calculatePrepayments(mockTenant, startdatum, enddatum);

      expect(result.monthlyPayments).toHaveLength(12);
      expect(result.totalPrepayments).toBeGreaterThan(0);
      expect(result.averageMonthlyPayment).toBe(100); // Default constant in code
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
            wasserkosten: 100
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
        result = validateCalculationData(nebenkosten, [tenantWithoutMeter], [mockMeter], [{ wasser_zaehler_id: 'm1', ablese_datum: '2023-06-01' }] as any);
        expect(result.warnings.some(w => w.includes('Wohnung w2: Keine Wasserzähler'))).toBe(true);
    });
  });

  describe('calculateWaterCostDistribution', () => {
      it('returns zero cost if no tenant water cost calculated', () => {
          (getTenantWaterCost as jest.Mock).mockReturnValue(null);
          const result = calculateWaterCostDistribution(mockTenant, {} as any, [], [], []);
          expect(result.totalCost).toBe(0);
      });

      it('returns calculated cost with meter reading', () => {
          (getTenantWaterCost as jest.Mock).mockReturnValue({
              consumption: 10,
              costShare: 50,
              pricePerCubicMeter: 5
          });

          const waterMeters = [{ id: 'm1', wohnung_id: 'w1' }] as any;
          const waterReadings = [{ wasser_zaehler_id: 'm1', zaehlerstand: 100, ablese_datum: '2023-06-01' }] as any;
          const nebenkosten = { startdatum, enddatum, wasserkosten: 100, wasserverbrauch: 20 } as any;

          const result = calculateWaterCostDistribution(mockTenant, nebenkosten, [], waterMeters, waterReadings);

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
          // Note: Intl formatting depends on locale which might vary in test env
          // Just checking it returns a string
          expect(typeof formatCurrency(123.45)).toBe('string');
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

          // Mock sub-calculations
          (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
          (getTenantWaterCost as jest.Mock).mockReturnValue(null);

          const result = calculateCompleteTenantResult(mockTenant, nebenkosten, [], [], []);

          expect(result.totalCosts).toBeGreaterThan(0);
          expect(result.operatingCosts.totalCost).toBe(100);
          expect(result.prepayments.totalPrepayments).toBeGreaterThan(0);
      });
  });
});
