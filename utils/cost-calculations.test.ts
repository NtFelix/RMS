
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
      occupancyDays: 365,
      effectivePeriodStart: startdatum,
      effectivePeriodEnd: enddatum
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

    it('correctly handles shared apartments (WGs) by using union of occupancy', () => {
      // 2 tenants in same apartment, same dates. Total house area = 50. Total cost = 1000.
      // Apartment weight should be 50 * 1 = 50. Both tenants share 50. Cost is 1000. Each pays 500.
      // With the old bug, weight was 100, cost 1000, each pays 500 but calculation was wrong mechanically in house context.

      const wgTenant1 = { id: 'wg1', wohnung_id: 'w_shared', Wohnungen: { groesse: 80 } } as any;
      const wgTenant2 = { id: 'wg2', wohnung_id: 'w_shared', Wohnungen: { groesse: 80 } } as any;
      const singleTenant = { id: 's1', wohnung_id: 'w_single', Wohnungen: { groesse: 20 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          return {
            occupancyRatio: 1,
            occupancyDays: 365,
            effectivePeriodStart: startdatum,
            effectivePeriodEnd: enddatum
          };
        });

      // Total house area = 80 (w_shared) + 20 (w_single) = 100. Total cost = 1000.
      // w_shared portion = 800. w_single portion = 200.
      // wg1 and wg2 should each pay 400. s1 pays 200.
      const result = calculateProFlächeDistribution([wgTenant1, wgTenant2, singleTenant], 1000, startdatum, enddatum);

      expect(result['s1'].amount).toBe(200);
      expect(result['wg1'].amount).toBe(400);
      expect(result['wg2'].amount).toBe(400);
    });

    it('handles sequential tenants in the same apartment without overbilling', () => {
      const t1 = { id: 't1', wohnung_id: 'w1', Wohnungen: { groesse: 100 } } as any;
      const t2 = { id: 't2', wohnung_id: 'w1', Wohnungen: { groesse: 100 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          if (t.id === 't1') return { occupancyRatio: 0.5, effectivePeriodStart: '2023-01-01', effectivePeriodEnd: '2023-06-30' };
          if (t.id === 't2') return { occupancyRatio: 0.5, effectivePeriodStart: '2023-07-01', effectivePeriodEnd: '2023-12-31' };
        });

      const result = calculateProFlächeDistribution([t1, t2], 1000, startdatum, enddatum);

      // Union occupancy is 100%. Apartment cost is 1000. 
      // t1 and t2 each have 0.5 ratio, they should get proportional shares of the apartment's cost.
      expect(result['t1'].amount).toBe(500);
      expect(result['t2'].amount).toBe(500);
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
        .mockReturnValueOnce({ occupancyDays: 100, occupancyRatio: 100 / 365 })
        .mockReturnValueOnce({ occupancyDays: 300, occupancyRatio: 300 / 365 });

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
