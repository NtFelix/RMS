import {
  germanToIsoDate,
  isoToGermanDate,
  validateGermanDate,
  calculateDaysBetween,
  calculateTenantOccupancy,
  validateDateRange,
  getDefaultDateRange,
  formatPeriodDuration,
} from '../../utils/date-calculations';

describe('Date Calculations Utilities', () => {
  describe('germanToIsoDate', () => {
    it('converts German date to ISO format', () => {
      expect(germanToIsoDate('31.12.2023')).toBe('2023-12-31');
      expect(germanToIsoDate('01.01.2024')).toBe('2024-01-01');
      expect(germanToIsoDate('1.1.2024')).toBe('2024-01-01');
    });

    it('returns empty string for invalid inputs', () => {
      expect(germanToIsoDate('')).toBe('');
      expect(germanToIsoDate('invalid')).toBe('');
      expect(germanToIsoDate('31/12/2023')).toBe('');
    });

    it('returns the input if it is already in ISO format', () => {
      expect(germanToIsoDate('2023-12-31')).toBe('2023-12-31');
    });
  });

  describe('isoToGermanDate', () => {
    it('converts ISO date to German format', () => {
      expect(isoToGermanDate('2023-12-31')).toBe('31.12.2023');
      expect(isoToGermanDate('2024-01-01')).toBe('1.1.2024');
    });

    it('returns empty string for invalid inputs', () => {
      expect(isoToGermanDate('')).toBe('');
      expect(isoToGermanDate('invalid')).toBe('');
    });

    it('returns the input if it is already in German format', () => {
      expect(isoToGermanDate('31.12.2023')).toBe('31.12.2023');
    });
  });

  describe('validateGermanDate', () => {
    it('validates correct German dates', () => {
      expect(validateGermanDate('31.12.2023')).toEqual({
        isValid: true,
        isoDate: '2023-12-31',
      });
    });

    it('validates ISO dates as valid', () => {
      expect(validateGermanDate('2023-12-31')).toEqual({
        isValid: true,
        isoDate: '2023-12-31',
      });
    });

    it('invalidates empty strings', () => {
      expect(validateGermanDate('')).toEqual({
        isValid: false,
        error: 'Datum ist erforderlich',
      });
      expect(validateGermanDate('   ')).toEqual({
        isValid: false,
        error: 'Datum ist erforderlich',
      });
    });

    it('invalidates bad formats', () => {
      expect(validateGermanDate('2023/12/31')).toEqual({
        isValid: false,
        error: 'Datum muss im Format TT.MM.JJJJ sein (z.B. 01.01.2024)',
      });
    });

    it('invalidates non-existent dates', () => {
      expect(validateGermanDate('31.02.2023')).toEqual({
        isValid: false,
        error: 'Ungültiges Datum',
      });
    });
  });

  describe('calculateDaysBetween', () => {
    it('calculates days correctly inclusive', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-10');
      // 1 to 10 is 10 days inclusive
      expect(calculateDaysBetween(start, end)).toBe(10);
    });

    it('calculates 1 day for same dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-01');
      expect(calculateDaysBetween(start, end)).toBe(1);
    });
  });

  describe('calculateTenantOccupancy', () => {
    const periodStart = '01.01.2024';
    const periodEnd = '31.12.2024'; // Leap year, 366 days

    it('calculates full occupancy if tenant is there for whole period', () => {
      const tenant = {
        id: '1',
        einzug: '2023-01-01',
        auszug: null,
      };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(366);
      expect(result.occupancyRatio).toBe(1);
    });

    it('calculates partial occupancy for move-in during period', () => {
      const tenant = {
        id: '2',
        einzug: '2024-07-01', // Halfway through
        auszug: null,
      };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      // From July 1st to Dec 31st 2024
      // July: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31 = 184 days
      expect(result.occupancyDays).toBe(184);
      expect(result.occupancyRatio).toBeCloseTo(184 / 366);
    });

    it('returns 0 if tenant moved in after period', () => {
      const tenant = {
        id: '3',
        einzug: '2025-01-01',
        auszug: null,
      };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(0);
      expect(result.occupancyRatio).toBe(0);
    });

    it('returns 0 if tenant has no move-in date', () => {
      const tenant = {
        id: '4',
        einzug: null,
        auszug: null,
      };
      const result = calculateTenantOccupancy(tenant, periodStart, periodEnd);
      expect(result.occupancyDays).toBe(0);
    });
  });

  describe('validateDateRange', () => {
    it('validates a correct range', () => {
      const result = validateDateRange('01.01.2024', '31.12.2024');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.periodDays).toBe(366);
    });

    it('returns error if start date is invalid', () => {
      const result = validateDateRange('invalid', '31.12.2024');
      expect(result.isValid).toBe(false);
      expect(result.errors.startdatum).toBeDefined();
    });

    it('returns error if end date is before start date', () => {
      const result = validateDateRange('31.12.2024', '01.01.2024');
      expect(result.isValid).toBe(false);
      expect(result.errors.range).toBe('Enddatum muss nach dem Startdatum liegen');
    });

    it('warns if period is too short', () => {
      const result = validateDateRange('01.01.2024', '05.01.2024');
      // The implementation returns isValid: false if there are any errors in the errors object.
      // But looking at the code:
      // return { isValid: Object.keys(errors).length === 0, ... }
      // So if errors.range is set (even for warning), isValid is false.
      expect(result.isValid).toBe(false);
      expect(result.errors.range).toContain('Warnung');
    });
  });

  describe('getDefaultDateRange', () => {
    it('returns current year range', () => {
      const currentYear = new Date().getFullYear();
      const range = getDefaultDateRange();
      expect(range.startdatum).toBe(`01.01.${currentYear}`);
      expect(range.enddatum).toBe(`31.12.${currentYear}`);
    });
  });

  describe('formatPeriodDuration', () => {
    it('formats single day', () => {
      expect(formatPeriodDuration('01.01.2024', '01.01.2024')).toBe('1 Tag');
    });

    it('formats days', () => {
      expect(formatPeriodDuration('01.01.2024', '10.01.2024')).toBe('10 Tage');
    });

    it('formats months', () => {
      expect(formatPeriodDuration('01.01.2024', '01.03.2024')).toContain('Monate');
    });

    it('formats years', () => {
      expect(formatPeriodDuration('01.01.2024', '31.12.2024')).toContain('Jahr');
    });

    it('handles invalid dates gracefully', () => {
      expect(formatPeriodDuration('invalid', 'invalid')).toBe('Ungültiger Zeitraum');
    });
  });
});
