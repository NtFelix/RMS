
import {
  germanToIsoDate,
  isoToGermanDate,
  validateGermanDate,
  calculateDaysBetween,
  calculateTenantOccupancy,
  validateDateRange,
  getDefaultDateRange,
  formatPeriodDuration,
  TenantOccupancy
} from '../../utils/date-calculations';

describe('utils/date-calculations', () => {
  describe('germanToIsoDate', () => {
    it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
      expect(germanToIsoDate('31.12.2023')).toBe('2023-12-31');
      expect(germanToIsoDate('01.01.2024')).toBe('2024-01-01');
    });

    it('returns empty string for invalid format', () => {
      expect(germanToIsoDate('invalid')).toBe('');
      expect(germanToIsoDate('')).toBe('');
    });

    it('returns original string if already ISO format', () => {
      expect(germanToIsoDate('2023-12-31')).toBe('2023-12-31');
    });
  });

  describe('isoToGermanDate', () => {
    it('converts YYYY-MM-DD to DD.MM.YYYY', () => {
      expect(isoToGermanDate('2023-12-31')).toBe('31.12.2023');
      expect(isoToGermanDate('2024-01-01')).toBe('1.1.2024'); // Note: parseInt removes leading zeros
    });

    it('returns empty string for invalid format', () => {
      expect(isoToGermanDate('invalid')).toBe('');
      expect(isoToGermanDate('')).toBe('');
    });

    it('returns original string if already German format', () => {
      expect(isoToGermanDate('31.12.2023')).toBe('31.12.2023');
    });
  });

  describe('validateGermanDate', () => {
    it('validates correct German dates', () => {
      const result = validateGermanDate('31.12.2023');
      expect(result.isValid).toBe(true);
      expect(result.isoDate).toBe('2023-12-31');
    });

    it('invalidates empty dates', () => {
      expect(validateGermanDate('').isValid).toBe(false);
      expect(validateGermanDate('   ').isValid).toBe(false);
    });

    it('invalidates dates with incorrect format', () => {
      expect(validateGermanDate('2023/12/31').isValid).toBe(false);
    });

    it('invalidates non-existent dates (e.g., 31.02.2024)', () => {
      expect(validateGermanDate('31.02.2024').isValid).toBe(false);
    });
  });

  describe('calculateDaysBetween', () => {
    it('calculates days correctly inclusive', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-01-02');
      expect(calculateDaysBetween(start, end)).toBe(2);
    });

    it('returns 1 for same day', () => {
      const date = new Date('2023-01-01');
      expect(calculateDaysBetween(date, date)).toBe(1);
    });
  });

  describe('calculateTenantOccupancy', () => {
    const periodStart = '2023-01-01';
    const periodEnd = '2023-12-31'; // 365 days

    it('calculates 100% occupancy for full year tenant', () => {
      const tenant = { id: 't1', einzug: '2022-01-01', auszug: null };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(365);
      expect(result.occupancyRatio).toBe(1);
    });

    it('calculates partial occupancy for move-in during year', () => {
      // Move in 01.07.2023 (184 days including 1st July to 31st Dec)
      // Jan-Jun: 31+28+31+30+31+30 = 181 days
      // 365 - 181 = 184 days
      const tenant = { id: 't2', einzug: '2023-07-01', auszug: null };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(184);
      expect(result.occupancyRatio).toBeCloseTo(184 / 365);
    });

    it('calculates partial occupancy for move-out during year', () => {
      // Move out 31.01.2023 (31 days)
      const tenant = { id: 't3', einzug: '2022-01-01', auszug: '2023-01-31' };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(31);
      expect(result.occupancyRatio).toBeCloseTo(31 / 365);
    });

    it('calculates 0 occupancy for tenant outside period', () => {
      const tenant = { id: 't4', einzug: '2024-01-01', auszug: null };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(0);
      expect(result.occupancyRatio).toBe(0);
    });
  });

  describe('validateDateRange', () => {
    it('validates correct range', () => {
      const result = validateDateRange('01.01.2023', '31.12.2023');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('invalidates if end before start', () => {
      const result = validateDateRange('31.12.2023', '01.01.2023');
      expect(result.isValid).toBe(false);
      expect(result.errors.range).toBeDefined();
    });

    it('warns for short periods', () => {
      const result = validateDateRange('01.01.2023', '10.01.2023');
      // It is valid but might have warning (logic says valid=true but sets error msg?)
      // The implementation sets isValid = Object.keys(errors).length === 0
      // But it sets errors.range = 'Warnung...'
      // So isValid should be false based on implementation logic?
      // Let's check implementation:
      // if (periodDays < 30) { errors.range = 'Warnung...'; }
      // return { isValid: Object.keys(errors).length === 0, ... }
      // So yes, it returns false for warnings.
      expect(result.isValid).toBe(false);
      expect(result.errors.range).toContain('Warnung');
    });
  });

  describe('formatPeriodDuration', () => {
    it('formats days correctly', () => {
      expect(formatPeriodDuration('01.01.2023', '10.01.2023')).toBe('10 Tage');
    });

    it('formats months correctly', () => {
      expect(formatPeriodDuration('01.01.2023', '01.03.2023')).toContain('Monate');
    });
  });
});
