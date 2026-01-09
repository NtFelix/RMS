
import { formatNumber, formatCurrency } from './format';

describe('format utils', () => {
  describe('formatNumber', () => {
    it('should format numbers with German locale and default 2 decimals', () => {
      expect(formatNumber(1234.56)).toBe('1.234,56');
      expect(formatNumber(1000)).toBe('1.000,00'); // Defaults to 2 decimals
    });

    it('should support custom fraction digits', () => {
      expect(formatNumber(1000, 0)).toBe('1.000');
      expect(formatNumber(0.12, 0)).toBe('0');
      expect(formatNumber(1234.5678, 3)).toBe('1.234,568');
    });

    it('should handle strings as input', () => {
      expect(formatNumber('1234.56')).toBe('1.234,56');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234.56)).toBe('-1.234,56');
    });

    it('should handle non-numeric string inputs', () => {
      expect(formatNumber('not a number')).toBe('0,00');
      expect(formatNumber('abc', 0)).toBe('0');
    });

    it('should handle NaN values', () => {
      expect(formatNumber(NaN)).toBe('0,00');
      expect(formatNumber(NaN, 0)).toBe('0');
      expect(formatNumber(NaN, 3)).toBe('0,000');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with Euro symbol and German locale', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe('1.234,56 €');
    });

    it('should handle zero and negative amounts', () => {
      expect(formatCurrency(0)).toBe('0,00 €');
      expect(formatCurrency(-50)).toBe('-50,00 €');
    });
  });
});
