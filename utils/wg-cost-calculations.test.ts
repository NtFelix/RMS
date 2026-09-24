import { getApartmentOccupants, computeWgFactorsByTenant } from './wg-cost-calculations';
import { Mieter } from '@/lib/data-fetching';

describe('wg-cost-calculations', () => {
  // Helper function to create a valid Mieter object with overrides
  const createMockTenant = (overrides: Partial<Mieter> = {}): Mieter => ({
    id: 'tenant-' + Math.random().toString(36).substr(2, 9),
    wohnung_id: 'apt1',
    name: 'Test Tenant',
    einzug: '2023-01-01',
    auszug: null,
    email: null,
    telefonnummer: null,
    notiz: null,
    nebenkosten: null,
    erstellt_von: 'user-123',
    ...overrides
  });

  describe('getApartmentOccupants', () => {
    it('should return occupants for a specific apartment', () => {
      const tenants = [
        createMockTenant({ id: '1', wohnung_id: 'apt1' }),
        createMockTenant({ id: '2', wohnung_id: 'apt2' }),
        createMockTenant({ id: '3', wohnung_id: 'apt1' })
      ];

      const occupants = getApartmentOccupants(tenants, 'apt1');
      expect(occupants).toHaveLength(2);
      expect(occupants.map(o => o.id)).toContain('1');
      expect(occupants.map(o => o.id)).toContain('3');
    });

    it('should return empty array if apartmentId is null', () => {
      const tenants = [createMockTenant({ id: '1', wohnung_id: 'apt1' })];
      expect(getApartmentOccupants(tenants, null)).toEqual([]);
    });

    it('should return empty array if no tenants match', () => {
      const tenants = [
        createMockTenant({ id: '1', wohnung_id: 'apt1' }),
        createMockTenant({ id: '2', wohnung_id: 'apt2' })
      ];
      expect(getApartmentOccupants(tenants, 'apt3')).toEqual([]);
    });

    it('should return empty array for empty tenants list', () => {
      expect(getApartmentOccupants([], 'apt1')).toEqual([]);
    });
  });

  describe('computeWgFactorsByTenant', () => {
    describe('year-based calculation', () => {
      it('should return 1.0 for a single tenant active all year', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        expect(factors['tenant1']).toBeCloseTo(1.0, 2);
      });

      it('should split equally between two tenants active all year in same apartment', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: null
          }),
          createMockTenant({
            id: 'tenant2',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        expect(factors['tenant1']).toBeCloseTo(0.5, 2);
        expect(factors['tenant2']).toBeCloseTo(0.5, 2);
      });

      it('should handle tenant moving out mid-year', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: '2023-06-30' // First half of year
          }),
          createMockTenant({
            id: 'tenant2',
            wohnung_id: 'apt1',
            einzug: '2023-07-01', // Second half of year
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        // Each tenant should get roughly half
        expect(factors['tenant1']).toBeGreaterThan(0.4);
        expect(factors['tenant1']).toBeLessThan(0.6);
        expect(factors['tenant2']).toBeGreaterThan(0.4);
        expect(factors['tenant2']).toBeLessThan(0.6);
      });

      it('should handle overlapping tenancy periods', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: '2023-08-31'
          }),
          createMockTenant({
            id: 'tenant2',
            wohnung_id: 'apt1',
            einzug: '2023-06-01', // Overlaps with tenant1 for June-August
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        // tenant1 is alone Jan-May, shared Jun-Aug
        // tenant2 is shared Jun-Aug, alone Sep-Dec
        expect(factors['tenant1'] + factors['tenant2']).toBeCloseTo(1.0, 1);
      });

      it('should handle tenants in different apartments independently', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: null
          }),
          createMockTenant({
            id: 'tenant2',
            wohnung_id: 'apt2',
            einzug: '2023-01-01',
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        // Each should be 1.0 since they're in different apartments
        expect(factors['tenant1']).toBeCloseTo(1.0, 2);
        expect(factors['tenant2']).toBeCloseTo(1.0, 2);
      });
    });

    describe('date-range based calculation', () => {
      it('should calculate factors for a specific date range', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-01-01',
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, '2023-06-01', '2023-06-30');
        expect(factors['tenant1']).toBeCloseTo(1.0, 2);
      });

      it('should handle partial occupancy in date range', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: '2023-06-15', // Joins mid-month
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, '2023-06-01', '2023-06-30');
        // Tenant is active for roughly half the month (16 days out of 30)
        expect(factors['tenant1']).toBeGreaterThan(0.4);
        expect(factors['tenant1']).toBeLessThan(0.6);
      });

      it('should count the move-in day when einzug carries a time component', () => {
        const tenants = [
          createMockTenant({ id: 'tenant1', wohnung_id: 'apt1', einzug: '2023-06-16T10:00:00Z', auszug: null })
        ];

        const factors = computeWgFactorsByTenant(tenants, '2023-06-01', '2023-06-30');
        expect(factors['tenant1']).toBeCloseTo(15 / 30, 5);
      });

      it('should throw error if end date is missing', () => {
        const tenants = [createMockTenant()];
        expect(() => {
          // @ts-expect-error Testing runtime error for missing end date
          computeWgFactorsByTenant(tenants, '2023-01-01');
        }).toThrow('End date is required when using date range');
      });
    });

    describe('edge cases', () => {
      it('should return empty object for empty tenants array', () => {
        const factors = computeWgFactorsByTenant([], 2023);
        expect(factors).toEqual({});
      });

      it('should handle tenant with null wohnung_id using their id as key', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant-no-apt',
            wohnung_id: null,
            einzug: '2023-01-01',
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        expect(factors['tenant-no-apt']).toBeCloseTo(1.0, 2);
      });

      it('should handle tenant without einzug date', () => {
        const tenants = [
          createMockTenant({
            id: 'tenant1',
            wohnung_id: 'apt1',
            einzug: null,
            auszug: null
          })
        ];

        const factors = computeWgFactorsByTenant(tenants, 2023);
        // No move-in date means no occupancy, matching calculateTenantOccupancy
        expect(factors['tenant1']).toBe(0);
      });
    });
  });
});
