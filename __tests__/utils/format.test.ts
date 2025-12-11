
import { formatNumber, formatCurrency } from '../../utils/format';

describe('utils/format', () => {
  describe('formatNumber', () => {
    it('formats numbers correctly with default fraction digits (2)', () => {
      expect(formatNumber(1234.56)).toBe('1.234,56');
      expect(formatNumber(1000)).toBe('1.000,00');
      expect(formatNumber(0)).toBe('0,00');
    });

    it('formats string numbers correctly', () => {
      expect(formatNumber('1234.56')).toBe('1.234,56');
      expect(formatNumber('1000')).toBe('1.000,00');
    });

    it('handles custom fraction digits', () => {
      expect(formatNumber(1234.5678, 3)).toBe('1.234,568');
      expect(formatNumber(1234.5678, 0)).toBe('1.235');
    });

    it('handles NaN gracefully', () => {
      expect(formatNumber('invalid')).toBe('0,00');
      expect(formatNumber('invalid', 0)).toBe('0');
    });
  });

  describe('formatCurrency', () => {
    it('formats currency correctly with € symbol', () => {
      expect(formatCurrency(1234.56)).toBe('1.234,56 €');
      expect(formatCurrency(1000)).toBe('1.000,00 €');
      expect(formatCurrency(0)).toBe('0,00 €');
    });

    it('formats string currency values correctly', () => {
      expect(formatCurrency('1234.56')).toBe('1.234,56 €');
    });
  });
});
