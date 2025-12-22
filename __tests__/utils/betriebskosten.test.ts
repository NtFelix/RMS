
import { normalizeBerechnungsart } from '@/utils/betriebskosten';

describe('Betriebskosten Utilities', () => {
  describe('normalizeBerechnungsart', () => {
    it('should normalize known variations', () => {
      expect(normalizeBerechnungsart('pro person')).toBe('pro Mieter');
      expect(normalizeBerechnungsart('Pro Mieter')).toBe('pro Mieter');
      expect(normalizeBerechnungsart('pro flaeche')).toBe('pro Flaeche');
      expect(normalizeBerechnungsart('pro qm')).toBe('pro Flaeche');
      expect(normalizeBerechnungsart('pro wohnung')).toBe('pro Wohnung');
    });

    it('should return valid values as is', () => {
      expect(normalizeBerechnungsart('pro Mieter')).toBe('pro Mieter');
      expect(normalizeBerechnungsart('pro Flaeche')).toBe('pro Flaeche');
    });

    it('should return empty string for unknown values', () => {
      expect(normalizeBerechnungsart('unknown')).toBe('');
    });
  });
});
