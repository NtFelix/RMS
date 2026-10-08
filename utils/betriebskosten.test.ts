
import { normalizeBerechnungsart, isSameCostName, findDuplicateNachRechnungName } from '@/utils/betriebskosten';

describe('Betriebskosten Utilities', () => {
  describe('normalizeBerechnungsart', () => {
    it('should normalize known variations', () => {
      expect(normalizeBerechnungsart('pro person')).toBe('pro Mieter');
      expect(normalizeBerechnungsart('Pro Mieter')).toBe('pro Mieter');
      expect(normalizeBerechnungsart('pro flaeche')).toBe('pro Flaeche');
      expect(normalizeBerechnungsart('pro qm')).toBe('pro Flaeche');
      expect(normalizeBerechnungsart('pro wohnung')).toBe('pro Wohnung');
      expect(normalizeBerechnungsart('pro Fläche')).toBe('pro Flaeche');
      expect(normalizeBerechnungsart(' pro Mieter ')).toBe('pro Mieter');
    });

    it('should return valid values as is', () => {
      expect(normalizeBerechnungsart('pro Mieter')).toBe('pro Mieter');
      expect(normalizeBerechnungsart('pro Flaeche')).toBe('pro Flaeche');
    });

    it('should return empty string for unknown values', () => {
      expect(normalizeBerechnungsart('unknown')).toBe('');
      expect(normalizeBerechnungsart('fix')).toBe('');
      expect(normalizeBerechnungsart('')).toBe('');
    });
  });

  describe('isSameCostName', () => {
    it('ignores surrounding whitespace', () => {
      expect(isSameCostName('Schornstein ', 'Schornstein')).toBe(true);
      expect(isSameCostName(' Schornstein', 'Schornstein ')).toBe(true);
    });

    it('stays case-sensitive and handles missing names', () => {
      expect(isSameCostName('schornstein', 'Schornstein')).toBe(false);
      expect(isSameCostName(null, '')).toBe(true);
      expect(isSameCostName(undefined, 'Schornstein')).toBe(false);
    });
  });

  describe('findDuplicateNachRechnungName', () => {
    it('finds a name used by two nach Rechnung items, ignoring whitespace', () => {
      expect(findDuplicateNachRechnungName(
        ['Reparatur', 'Grundsteuer', 'Reparatur '],
        ['nach Rechnung', 'pro Flaeche', 'nach Rechnung']
      )).toBe('Reparatur');
    });

    it('ignores duplicates that are not both nach Rechnung and empty names', () => {
      expect(findDuplicateNachRechnungName(
        ['Reparatur', 'Reparatur', '', ''],
        ['nach Rechnung', 'pro Flaeche', 'nach Rechnung', 'nach Rechnung']
      )).toBeNull();
    });
  });
});
