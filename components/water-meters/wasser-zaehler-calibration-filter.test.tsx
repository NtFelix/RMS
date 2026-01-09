/**
 * Test suite for Wasserzähler calibration date filtering in Abrechnung modal
 * 
 * Tests the logic that filters out water meters whose Eichungsdatum (calibration date)
 * has expired before the Abrechnung period ends.
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Check if a water meter's calibration date is valid for the given Abrechnung period
 * A meter is valid if its Eichungsdatum is AFTER the end date of the Abrechnung
 * (i.e., the calibration is still valid during the entire Abrechnung period)
 */
function isCalibrationValid(eichungsdatum: string | null, abrechnungEnddatum: string): boolean {
  // If no calibration date is set, consider it valid (no expiration)
  if (!eichungsdatum) return true;
  
  // Parse dates
  const calibrationDate = new Date(eichungsdatum);
  const abrechnungEnd = new Date(abrechnungEnddatum);
  
  // Reset time to compare only dates
  calibrationDate.setHours(0, 0, 0, 0);
  abrechnungEnd.setHours(0, 0, 0, 0);
  
  // Meter is valid if calibration date is AFTER the Abrechnung end date
  // This means the meter was still calibrated during the entire Abrechnung period
  return calibrationDate > abrechnungEnd;
}

describe('Wasserzähler Calibration Date Filtering', () => {
  describe('isCalibrationValid', () => {
    it('should return true when eichungsdatum is null (no expiration)', () => {
      const result = isCalibrationValid(null, '2025-12-31');
      expect(result).toBe(true);
    });

    it('should return false when eichungsdatum is before abrechnung end date (expired)', () => {
      // Calibration date: 2023-12-31, Abrechnung ends: 2025-12-31
      // Meter expired in 2023, so it's not valid for 2025 Abrechnung
      const result = isCalibrationValid('2023-12-31', '2025-12-31');
      expect(result).toBe(false);
    });

    it('should return true when eichungsdatum is after abrechnung end date (still valid)', () => {
      // Calibration date: 2026-12-31, Abrechnung ends: 2025-12-31
      // Meter is calibrated until 2026, so it's valid for 2025 Abrechnung
      const result = isCalibrationValid('2026-12-31', '2025-12-31');
      expect(result).toBe(true);
    });

    it('should return false when eichungsdatum equals abrechnung end date', () => {
      // Calibration date: 2025-12-31, Abrechnung ends: 2025-12-31
      // Meter expires exactly when Abrechnung ends, so it's not valid
      const result = isCalibrationValid('2025-12-31', '2025-12-31');
      expect(result).toBe(false);
    });

    it('should handle year boundaries correctly', () => {
      // Calibration date: 2024-01-01, Abrechnung ends: 2025-12-31
      const result = isCalibrationValid('2024-01-01', '2025-12-31');
      expect(result).toBe(false);
    });

    it('should return true for future calibration dates', () => {
      // Calibration date: 2030-06-15, Abrechnung ends: 2025-12-31
      const result = isCalibrationValid('2030-06-15', '2025-12-31');
      expect(result).toBe(true);
    });

    it('should handle same year but different months', () => {
      // Calibration date: 2025-06-30, Abrechnung ends: 2025-12-31
      // Meter expires mid-year, so it's not valid for the full year
      const result = isCalibrationValid('2025-06-30', '2025-12-31');
      expect(result).toBe(false);
    });

    it('should handle leap years correctly', () => {
      // Calibration date: 2024-02-29, Abrechnung ends: 2025-12-31
      const result = isCalibrationValid('2024-02-29', '2025-12-31');
      expect(result).toBe(false);
    });
  });

  describe('Real-world scenarios', () => {
    it('should filter out meter with 2023 calibration for 2025 Abrechnung', () => {
      // User's scenario: Eichungsdatum 2023, Abrechnung 2025
      const meters = [
        { id: '1', eichungsdatum: '2023-12-31' },
        { id: '2', eichungsdatum: '2026-12-31' },
        { id: '3', eichungsdatum: null },
      ];

      const abrechnungEnd = '2025-12-31';
      const validMeters = meters.filter(m => isCalibrationValid(m.eichungsdatum, abrechnungEnd));

      expect(validMeters).toHaveLength(2);
      expect(validMeters.map(m => m.id)).toEqual(['2', '3']);
    });

    it('should show all meters when all have valid calibration dates', () => {
      const meters = [
        { id: '1', eichungsdatum: '2026-12-31' },
        { id: '2', eichungsdatum: '2027-06-30' },
        { id: '3', eichungsdatum: null },
      ];

      const abrechnungEnd = '2025-12-31';
      const validMeters = meters.filter(m => isCalibrationValid(m.eichungsdatum, abrechnungEnd));

      expect(validMeters).toHaveLength(3);
    });

    it('should filter out all meters when all have expired calibration dates', () => {
      const meters = [
        { id: '1', eichungsdatum: '2023-12-31' },
        { id: '2', eichungsdatum: '2024-06-30' },
        { id: '3', eichungsdatum: '2022-01-01' },
      ];

      const abrechnungEnd = '2025-12-31';
      const validMeters = meters.filter(m => isCalibrationValid(m.eichungsdatum, abrechnungEnd));

      expect(validMeters).toHaveLength(0);
    });

    it('should handle Abrechnung spanning multiple years', () => {
      // Abrechnung from 2024-01-01 to 2025-12-31
      const meters = [
        { id: '1', eichungsdatum: '2023-12-31' }, // Expired before start
        { id: '2', eichungsdatum: '2025-06-30' }, // Expires during period
        { id: '3', eichungsdatum: '2026-01-01' }, // Valid after end
      ];

      const abrechnungEnd = '2025-12-31';
      const validMeters = meters.filter(m => isCalibrationValid(m.eichungsdatum, abrechnungEnd));

      expect(validMeters).toHaveLength(1);
      expect(validMeters[0].id).toBe('3');
    });
  });
});
