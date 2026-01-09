
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution,
  calculateNachRechnungDistribution,
  calculateWaterCostDistribution
} from './cost-calculations';
import { calculateTenantOccupancy } from './date-calculations';

// Mock the date calculation to control the output
jest.mock('./date-calculations', () => ({
  calculateTenantOccupancy: jest.fn()
}));

describe('cost-calculations', () => {
  const mockTenant1 = { id: 't1', wohnung_id: 'w1', Wohnungen: { groesse: 50 } } as any;
  const mockTenant2 = { id: 't2', wohnung_id: 'w2', Wohnungen: { groesse: 50 } } as any;
  const mockTenants = [mockTenant1, mockTenant2];
  const startdatum = '2023-01-01';
  const enddatum = '2023-12-31';

  beforeEach(() => {
    jest.clearAllMocks();
    (calculateTenantOccupancy as jest.Mock).mockReturnValue({
      occupancyRatio: 1,
      occupancyDays: 365
    });
  });

  describe('calculateProFlächeDistribution', () => {
    it('distributes costs equally for equal size and full occupancy', () => {
      const result = calculateProFlächeDistribution(mockTenants, 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBe(500);
      expect(result['t2'].amount).toBe(500);
    });

    it('distributes based on size', () => {
      const smallTenant = { ...mockTenant1, id: 't3', Wohnungen: { groesse: 30 } };
      const largeTenant = { ...mockTenant2, id: 't4', Wohnungen: { groesse: 70 } };

      const result = calculateProFlächeDistribution([smallTenant, largeTenant], 1000, startdatum, enddatum);
      expect(result['t3'].amount).toBeCloseTo(300);
      expect(result['t4'].amount).toBeCloseTo(700);
    });

    it('handles zero total area', () => {
      const zeroTenant = { ...mockTenant1, Wohnungen: { groesse: 0 } };
      const result = calculateProFlächeDistribution([zeroTenant], 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBe(0);
    });
  });

  describe('calculateProMieterDistribution', () => {
    it('distributes equally for full occupancy', () => {
      const result = calculateProMieterDistribution(mockTenants, 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBe(500);
      expect(result['t2'].amount).toBe(500);
    });

    it('distributes based on occupancy days', () => {
      (calculateTenantOccupancy as jest.Mock)
        .mockReturnValueOnce({ occupancyDays: 100, occupancyRatio: 100/365 })
        .mockReturnValueOnce({ occupancyDays: 300, occupancyRatio: 300/365 });

      const result = calculateProMieterDistribution(mockTenants, 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBeCloseTo(250);
      expect(result['t2'].amount).toBeCloseTo(750);
    });
  });

  describe('calculateProWohnungDistribution', () => {
    it('distributes per apartment then per tenant', () => {
      // Two tenants in one apartment, one in another
      const t1 = { id: 't1', wohnung_id: 'w1' } as any;
      const t2 = { id: 't2', wohnung_id: 'w1' } as any;
      const t3 = { id: 't3', wohnung_id: 'w2' } as any;

      const result = calculateProWohnungDistribution([t1, t2, t3], 1200, startdatum, enddatum);

      // Based on current implementation (which weights by tenant occupancy sum per apartment):
      // w1 total days = 730 (2 tenants). w2 total days = 365 (1 tenant).
      // Total = 1095. w1 gets 730/1095 = 2/3. w2 gets 1/3.
      // w1 (800) -> split by 2 tenants = 400 each.
      // w2 (400) -> 400.
      expect(result['t1'].amount).toBeCloseTo(400);
      expect(result['t2'].amount).toBeCloseTo(400);
      expect(result['t3'].amount).toBeCloseTo(400);
    });
  });

  describe('calculateNachRechnungDistribution', () => {
    it('distributes individual amounts weighted by occupancy', () => {
      const individualAmounts = { 't1': 100, 't2': 200 };

      // Full occupancy
      const result = calculateNachRechnungDistribution(individualAmounts, mockTenants, startdatum, enddatum);
      expect(result['t1'].amount).toBe(100);
      expect(result['t2'].amount).toBe(200);
    });

    it('reduces amount for partial occupancy', () => {
       (calculateTenantOccupancy as jest.Mock).mockReturnValue({
        occupancyRatio: 0.5,
        occupancyDays: 180
      });

      const individualAmounts = { 't1': 100 };
      const result = calculateNachRechnungDistribution(individualAmounts, [mockTenant1], startdatum, enddatum);
      expect(result['t1'].amount).toBe(50);
    });
  });

  describe('calculateWaterCostDistribution', () => {
    it('distributes based on consumption', () => {
      const waterReadings = { 't1': 10, 't2': 30 };
      const result = calculateWaterCostDistribution(mockTenants, 100, waterReadings, startdatum, enddatum);

      // Total consumption = 40. t1 = 1/4, t2 = 3/4
      expect(result['t1'].amount).toBeCloseTo(25);
      expect(result['t2'].amount).toBeCloseTo(75);
    });

     it('handles zero total consumption', () => {
      const waterReadings = { 't1': 0, 't2': 0 };
      const result = calculateWaterCostDistribution(mockTenants, 100, waterReadings, startdatum, enddatum);
      expect(result['t1'].amount).toBe(0);
      expect(result['t2'].amount).toBe(0);
    });
  });
});
