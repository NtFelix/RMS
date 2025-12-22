
import {
  calculateOccupancyPercentage,
  calculateTenantCosts,
  calculatePrepayments,
  validateCalculationData
} from '../../utils/abrechnung-calculations';
import { calculateTenantOccupancy } from '../../utils/date-calculations';
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution
} from '../../utils/cost-calculations';

// Mock dependencies
jest.mock('../../utils/date-calculations', () => ({
  calculateTenantOccupancy: jest.fn()
}));

jest.mock('../../utils/cost-calculations', () => ({
  calculateProFlächeDistribution: jest.fn(),
  calculateProMieterDistribution: jest.fn(),
  calculateProWohnungDistribution: jest.fn(),
  calculateNachRechnungDistribution: jest.fn(),
  calculateWaterCostDistribution: jest.fn()
}));

jest.mock('../../utils/water-cost-calculations', () => ({
  getTenantWaterCost: jest.fn()
}));

describe('abrechnung-calculations', () => {
  const startdatum = '2023-01-01';
  const enddatum = '2023-12-31';
  const mockTenant = {
    id: 't1',
    name: 'Max',
    Wohnungen: { groesse: 50 },
    einzug: '2023-01-01',
    auszug: null
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
  });
});
