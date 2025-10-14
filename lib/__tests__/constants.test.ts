import { BERECHNUNGSART_OPTIONS, BERECHNUNGSART_VALUES } from '../constants';

describe('lib/constants', () => {
  describe('BERECHNUNGSART_OPTIONS', () => {
    it('should contain all expected calculation types', () => {
      expect(BERECHNUNGSART_OPTIONS).toHaveLength(4);
      
      const expectedOptions = [
        { value: 'pro Flaeche', label: 'pro Fläche' },
        { value: 'pro Mieter', label: 'pro Mieter' },
        { value: 'pro Wohnung', label: 'pro Wohnung' },
        { value: 'nach Rechnung', label: 'nach Rechnung' }
      ];
      
      expect(BERECHNUNGSART_OPTIONS).toEqual(expectedOptions);
    });

    it('should have consistent structure for all options', () => {
      BERECHNUNGSART_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(option.value.length).toBeGreaterThan(0);
        expect(option.label.length).toBeGreaterThan(0);
      });
    });

    it('should have unique values', () => {
      const values = BERECHNUNGSART_OPTIONS.map(opt => opt.value);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it('should have unique labels', () => {
      const labels = BERECHNUNGSART_OPTIONS.map(opt => opt.label);
      const uniqueLabels = [...new Set(labels)];
      expect(labels).toHaveLength(uniqueLabels.length);
    });
  });

  describe('BERECHNUNGSART_VALUES', () => {
    it('should contain all values from BERECHNUNGSART_OPTIONS', () => {
      const expectedValues = BERECHNUNGSART_OPTIONS.map(opt => opt.value);
      expect(BERECHNUNGSART_VALUES).toEqual(expectedValues);
    });

    it('should contain expected calculation types', () => {
      expect(BERECHNUNGSART_VALUES).toContain('pro Flaeche');
      expect(BERECHNUNGSART_VALUES).toContain('pro Mieter');
      expect(BERECHNUNGSART_VALUES).toContain('pro Wohnung');
      expect(BERECHNUNGSART_VALUES).toContain('nach Rechnung');
    });

    it('should have the same length as BERECHNUNGSART_OPTIONS', () => {
      expect(BERECHNUNGSART_VALUES).toHaveLength(BERECHNUNGSART_OPTIONS.length);
    });

    it('should be an array of strings', () => {
      expect(Array.isArray(BERECHNUNGSART_VALUES)).toBe(true);
      BERECHNUNGSART_VALUES.forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });
});