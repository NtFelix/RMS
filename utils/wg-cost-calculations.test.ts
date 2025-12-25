
import { getApartmentOccupants, isTenantActiveInMonth } from './wg-cost-calculations';

describe('wg-cost-calculations', () => {
  describe('isTenantActiveInMonth', () => {
    it('should return true if tenant is active in the given month', () => {
      const tenant = {
        einzug: '2023-01-01', // Note: Property name is 'einzug', not 'einzug_datum' based on file reading
        auszug: null
      };
      // Check for March 2023 (Year 2023, Month Index 2)
      expect(isTenantActiveInMonth(tenant as any, 2023, 2)).toBe(true);
    });

    it('should return false if tenant moved in after the month', () => {
        const tenant = {
            einzug: '2023-04-01',
            auszug: null
        };
        // Check for March 2023
        expect(isTenantActiveInMonth(tenant as any, 2023, 2)).toBe(false);
    });

    it('should return false if tenant moved out before the month', () => {
        const tenant = {
            einzug: '2023-01-01',
            auszug: '2023-02-28'
        };
        // Check for March 2023
        expect(isTenantActiveInMonth(tenant as any, 2023, 2)).toBe(false);
    });
  });

  describe('getApartmentOccupants', () => {
    it('should return correct number of occupants', () => {
      const tenants = [
        { id: '1', wohnung_id: 'apt1', einzug: '2023-01-01', auszug: null },
        { id: '2', wohnung_id: 'apt2', einzug: '2023-01-01', auszug: null },
      ];

      const occupants = getApartmentOccupants(tenants as any[], 'apt1');
      expect(occupants).toHaveLength(1);
      expect(occupants[0].id).toBe('1');
    });

    it('should return empty array if apartmentId is null', () => {
        const tenants = [{ id: '1', wohnung_id: 'apt1' }];
        expect(getApartmentOccupants(tenants as any[], null)).toEqual([]);
    });
  });
});
