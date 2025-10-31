
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution,
  calculateNachRechnungDistribution,
  calculateWaterCostDistribution,
} from '@/utils/cost-calculations';
import { Mieter } from '@/lib/data-fetching';

// Base mock tenants
const mockTenants: Mieter[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    telefon: '123456789',
    adresse: '123 Main St',
    stadt: 'Anytown',
    plz: '12345',
    land: 'DE',
    mietbeginn: '2023-01-01',
    mietende: null,
    einzug: '2023-01-01',
    auszug: null,
    kaution: 1000,
    created_at: '2023-01-01T00:00:00.000Z',
    user_id: 'user-1',
    wohnung_id: 'wohnung-1',
    Wohnungen: { groesse: 50 },
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    telefon: '987654321',
    adresse: '456 Oak Ave',
    stadt: 'Anytown',
    plz: '12345',
    land: 'DE',
    mietbeginn: '2023-07-01',
    mietende: null,
    einzug: '2023-07-01',
    auszug: null,
    kaution: 1200,
    created_at: '2023-07-01T00:00:00.000Z',
    user_id: 'user-1',
    wohnung_id: 'wohnung-2',
    Wohnungen: { groesse: 75 },
  },
];

describe('Cost Calculation Functions', () => {
  const startdatum = '2023-01-01';
  const enddatum = '2023-12-31';
  const totalCost = 1000;

  describe('calculateProFlächeDistribution', () => {
    it('should return zero distribution for empty tenant list', () => {
      const distribution = calculateProFlächeDistribution([], totalCost, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(0);
    });

    it('should handle zero total cost', () => {
      const distribution = calculateProFlächeDistribution(mockTenants, 0, startdatum, enddatum);
      expect(distribution['1'].amount).toBe(0);
      expect(distribution['2'].amount).toBe(0);
    });

    it('should distribute costs based on area and occupancy', () => {
      const distribution = calculateProFlächeDistribution(mockTenants, totalCost, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(2);
      expect(distribution['1'].amount).toBeCloseTo(569.42, 2);
      expect(distribution['2'].amount).toBeCloseTo(430.58, 2);
    });
  });

  describe('calculateProMieterDistribution', () => {
    it('should return zero distribution for empty tenant list', () => {
      const distribution = calculateProMieterDistribution([], totalCost, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(0);
    });

    it('should distribute costs per tenant based on occupancy', () => {
      const distribution = calculateProMieterDistribution(mockTenants, totalCost, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(2);
      expect(distribution['1'].amount).toBeCloseTo(664.85, 2);
      expect(distribution['2'].amount).toBeCloseTo(335.15, 2);
    });
  });

  describe('calculateProWohnungDistribution', () => {
    it('should return zero distribution for empty tenant list', () => {
      const distribution = calculateProWohnungDistribution([], totalCost, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(0);
    });

    it('should distribute costs equally among tenants in the same apartment', () => {
        const sharedWohnungTenants = [
            mockTenants[0],
            { ...mockTenants[0], id: '3', einzug: '2023-01-01', auszug: '2023-06-30' }
        ];
        const distribution = calculateProWohnungDistribution(sharedWohnungTenants, totalCost, startdatum, enddatum);
        expect(distribution['1'].amount).toBeCloseTo(500, 2);
        expect(distribution['3'].amount).toBeCloseTo(500, 2);
    });
  });

  describe('calculateNachRechnungDistribution', () => {
    it('should return zero distribution for empty tenant list', () => {
      const distribution = calculateNachRechnungDistribution({}, [], startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(0);
    });

    it('should apply individual amounts with occupancy weighting', () => {
      const individualAmounts = { '1': 500, '2': 500 };
      const distribution = calculateNachRechnungDistribution(individualAmounts, mockTenants, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(2);
      expect(distribution['1'].amount).toBeCloseTo(500, 2);
      expect(distribution['2'].amount).toBeCloseTo(252.05, 2);
    });
  });

  describe('calculateWaterCostDistribution', () => {
    it('should return zero distribution for empty tenant list', () => {
      const distribution = calculateWaterCostDistribution([], totalCost, {}, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(0);
    });

    it('should distribute water costs based on consumption and occupancy', () => {
      const waterReadings = { '1': 100, '2': 150 };
      const distribution = calculateWaterCostDistribution(mockTenants, totalCost, waterReadings, startdatum, enddatum);
      expect(Object.keys(distribution).length).toBe(2);
      expect(distribution['1'].amount).toBeCloseTo(569.42, 2);
      expect(distribution['2'].amount).toBeCloseTo(430.58, 2);
    });
  });
});
