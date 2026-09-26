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

    // All expected values are worked out by hand from the Rechentage rules (rechentage.ts)
    describe('360-day basis (Rechentage)', () => {
      const P2026 = ['2026-01-01', '2026-12-31'] as const;

      it('gives a full-year tenant a factor of 1', () => {
        const tenants = [createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2020-01-01', auszug: null })];
        const factors = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        expect(factors['t1']).toBe(1);
      });

      it('splits a full-year WG equally', () => {
        const tenants = [
          createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2020-01-01', auszug: null }),
          createMockTenant({ id: 't2', wohnung_id: 'w1', einzug: '2020-01-01', auszug: null })
        ];
        const factors = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        expect(factors['t1']).toBe(0.5);
        expect(factors['t2']).toBe(0.5);
      });

      it('splits a seamless month-aligned handover without a gap or overlap', () => {
        // t1 leaves on 30.06. (end of the month), t2 moves in on 01.07.: no shared or missing day
        const tenants = [
          createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2020-01-01', auszug: '2026-06-30' }),
          createMockTenant({ id: 't2', wohnung_id: 'w1', einzug: '2026-07-01', auszug: null })
        ];
        const factors = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        expect(factors['t1']).toBeCloseTo(0.5, 10);
        expect(factors['t2']).toBeCloseTo(0.5, 10);
        expect(factors['t1'] + factors['t2']).toBeCloseTo(1, 10);
      });

      it('splits an overlapping WG: solo Rechentage full, shared Rechentage by half', () => {
        // t1 all year (360 Rechentage). t2 joins 01.07. and stays (180 Rechentage).
        // Jan-Jun (180) solo for t1; Jul-Dec (180) shared: t1 = 180 + 90 = 270, t2 = 90
        const tenants = [
          createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2020-01-01', auszug: null }),
          createMockTenant({ id: 't2', wohnung_id: 'w1', einzug: '2026-07-01', auszug: null })
        ];
        const factors = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        expect(factors['t1']).toBeCloseTo(270 / 360, 10);
        expect(factors['t2']).toBeCloseTo(90 / 360, 10);
      });

      it('leaves vacant Rechentage with the landlord (factor stays below 1)', () => {
        // Tenant moves in 01.07.: only the second half of the year (180 of 360) is occupied
        const tenants = [createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2026-07-01', auszug: null })];
        const factors = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        expect(factors['t1']).toBeCloseTo(0.5, 10);
      });

      it('treats tenants in different apartments independently', () => {
        const tenants = [
          createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2020-01-01', auszug: null }),
          createMockTenant({ id: 't2', wohnung_id: 'w2', einzug: '2026-07-01', auszug: null })
        ];
        const factors = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        expect(factors['t1']).toBe(1);
        expect(factors['t2']).toBeCloseTo(0.5, 10);
      });

      it('gives a tenant without a move-in date a factor of 0, as on the calendar basis', () => {
        const tenants = [createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: null, auszug: null })];
        expect(computeWgFactorsByTenant(tenants, ...P2026, '360_tage')['t1']).toBe(0);
      });

      it('defaults to the calendar basis when rechenbasis is omitted', () => {
        const tenants = [createMockTenant({ id: 't1', wohnung_id: 'w1', einzug: '2026-07-01', auszug: null })];
        const calendarFactor = computeWgFactorsByTenant(tenants, ...P2026);
        const rechentageFactor = computeWgFactorsByTenant(tenants, ...P2026, '360_tage');
        // 2026-07-01..12-31 is 184 of 365 calendar days, but exactly half (180/360) of the Rechentage
        expect(calendarFactor['t1']).toBeCloseTo(184 / 365, 10);
        expect(rechentageFactor['t1']).toBeCloseTo(0.5, 10);
      });
    });
  });
});
