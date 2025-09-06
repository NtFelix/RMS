import { calculateTenantOccupancy } from '../utils/date-calculations';

describe('calculateTenantOccupancy', () => {
  it('should return 0 occupancy when tenant has no move-in date', () => {
    const tenant = {
      id: 'tenant-1',
      einzug: null,
      auszug: null
    };
    
    const result = calculateTenantOccupancy(tenant, '2024-01-01', '2024-12-31');
    
    expect(result).toEqual({
      tenantId: 'tenant-1',
      occupancyDays: 0,
      occupancyRatio: 0
    });
  });

  it('should calculate correct occupancy for tenant with move-in and move-out dates', () => {
    const tenant = {
      id: 'tenant-1',
      einzug: '2024-04-01', // April 1, 2024
      auszug: '2024-06-30'  // June 30, 2024
    };
    
    const result = calculateTenantOccupancy(tenant, '2024-01-01', '2024-12-31');
    
    // April 1 to June 30, 2024 is 91 days (inclusive)
    expect(result.occupancyDays).toBe(91);
    expect(result.occupancyRatio).toBeCloseTo(91 / 366); // 2024 is a leap year
  });

  it('should handle tenant still living there (no move-out date)', () => {
    const tenant = {
      id: 'tenant-1',
      einzug: '2024-04-01',
      auszug: null // Still living there
    };
    
    const result = calculateTenantOccupancy(tenant, '2024-01-01', '2024-12-31');
    
    // April 1 to December 31, 2024 is 275 days (inclusive)
    expect(result.occupancyDays).toBe(275);
    expect(result.occupancyRatio).toBeCloseTo(275 / 366);
  });

  it('should handle tenant moving in after period start', () => {
    const tenant = {
      id: 'tenant-1',
      einzug: '2024-07-01', // July 1, 2024
      auszug: '2024-12-31'  // December 31, 2024
    };
    
    const result = calculateTenantOccupancy(tenant, '2024-01-01', '2024-12-31');
    
    // July 1 to December 31, 2024 is 184 days (inclusive)
    expect(result.occupancyDays).toBe(184);
    expect(result.occupancyRatio).toBeCloseTo(184 / 366);
  });

  it('should return 0 if tenant moves in after period end', () => {
    const tenant = {
      id: 'tenant-1',
      einzug: '2025-01-01', // After period end
      auszug: '2025-12-31'
    };
    
    const result = calculateTenantOccupancy(tenant, '2024-01-01', '2024-12-31');
    
    expect(result.occupancyDays).toBe(0);
    expect(result.occupancyRatio).toBe(0);
  });

  it('should return 0 if tenant moves out before period start', () => {
    const tenant = {
      id: 'tenant-1',
      einzug: '2023-01-01',
      auszug: '2023-12-31' // Before period start
    };
    
    const result = calculateTenantOccupancy(tenant, '2024-01-01', '2024-12-31');
    
    expect(result.occupancyDays).toBe(0);
    expect(result.occupancyRatio).toBe(0);
  });
});
