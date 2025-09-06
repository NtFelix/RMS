/**
 * Tests for Wasserzähler data saving optimizations
 * Verifies client-side validation and database function integration
 */

import { validateWasserzaehlerFormData, validateWasserzaehlerEntry, formatValidationErrors, prepareWasserzaehlerDataForSubmission } from '@/utils/wasserzaehler-validation';
import { WasserzaehlerFormData, WasserzaehlerFormEntry } from '@/lib/data-fetching';

describe('Wasserzähler Validation', () => {
  describe('validateWasserzaehlerEntry', () => {
    it('should validate a correct entry', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: '2024-01-15',
        zaehlerstand: 1234.5,
        verbrauch: 50.2
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(0);
    });

    it('should reject entry with missing mieter_id', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: '',
        mieter_name: 'Test Mieter',
        ablese_datum: '2024-01-15',
        zaehlerstand: 1234.5,
        verbrauch: 50.2
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('mieter_id');
      expect(errors[0].message).toBe('Mieter ID ist erforderlich');
    });

    it('should reject entry with invalid zaehlerstand', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: '2024-01-15',
        zaehlerstand: 'invalid',
        verbrauch: 50.2
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('zaehlerstand');
      expect(errors[0].message).toBe('Zählerstand muss eine positive Zahl sein');
    });

    it('should reject entry with negative zaehlerstand', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: '2024-01-15',
        zaehlerstand: -100,
        verbrauch: 50.2
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('zaehlerstand');
      expect(errors[0].message).toBe('Zählerstand muss eine positive Zahl sein');
    });

    it('should reject entry with invalid verbrauch', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: '2024-01-15',
        zaehlerstand: 1234.5,
        verbrauch: 'invalid'
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('verbrauch');
      expect(errors[0].message).toBe('Verbrauch muss eine positive Zahl sein');
    });

    it('should reject entry with future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: futureDateString,
        zaehlerstand: 1234.5,
        verbrauch: 50.2
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('ablese_datum');
      expect(errors[0].message).toBe('Ablesedatum darf nicht in der Zukunft liegen');
    });

    it('should accept entry with empty verbrauch', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: '2024-01-15',
        zaehlerstand: 1234.5,
        verbrauch: ''
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(0);
    });

    it('should accept entry with null ablese_datum', () => {
      const entry: WasserzaehlerFormEntry = {
        mieter_id: 'test-mieter-id',
        mieter_name: 'Test Mieter',
        ablese_datum: null,
        zaehlerstand: 1234.5,
        verbrauch: 50.2
      };

      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateWasserzaehlerFormData', () => {
    it('should validate correct form data', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'test-nebenkosten-id',
        entries: [
          {
            mieter_id: 'mieter-1',
            mieter_name: 'Mieter 1',
            ablese_datum: '2024-01-15',
            zaehlerstand: 1234.5,
            verbrauch: 50.2
          },
          {
            mieter_id: 'mieter-2',
            mieter_name: 'Mieter 2',
            ablese_datum: '2024-01-15',
            zaehlerstand: 2345.6,
            verbrauch: 60.3
          }
        ]
      };

      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validEntries).toHaveLength(2);
    });

    it('should reject form data with missing nebenkosten_id', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: '',
        entries: [
          {
            mieter_id: 'mieter-1',
            mieter_name: 'Mieter 1',
            ablese_datum: '2024-01-15',
            zaehlerstand: 1234.5,
            verbrauch: 50.2
          }
        ]
      };

      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('nebenkosten_id');
    });

    it('should detect duplicate mieter_ids', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'test-nebenkosten-id',
        entries: [
          {
            mieter_id: 'mieter-1',
            mieter_name: 'Mieter 1',
            ablese_datum: '2024-01-15',
            zaehlerstand: 1234.5,
            verbrauch: 50.2
          },
          {
            mieter_id: 'mieter-1', // Duplicate
            mieter_name: 'Mieter 1',
            ablese_datum: '2024-01-15',
            zaehlerstand: 2345.6,
            verbrauch: 60.3
          }
        ]
      };

      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Doppelte Einträge'))).toBe(true);
    });

    it('should handle empty entries array', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'test-nebenkosten-id',
        entries: []
      };

      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(true);
      expect(result.validEntries).toHaveLength(0);
    });

    it('should filter out invalid entries but keep valid ones', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'test-nebenkosten-id',
        entries: [
          {
            mieter_id: 'mieter-1',
            mieter_name: 'Mieter 1',
            ablese_datum: '2024-01-15',
            zaehlerstand: 1234.5,
            verbrauch: 50.2
          },
          {
            mieter_id: '', // Invalid
            mieter_name: 'Mieter 2',
            ablese_datum: '2024-01-15',
            zaehlerstand: 2345.6,
            verbrauch: 60.3
          },
          {
            mieter_id: 'mieter-3',
            mieter_name: 'Mieter 3',
            ablese_datum: '2024-01-15',
            zaehlerstand: 3456.7,
            verbrauch: 70.4
          }
        ]
      };

      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(false); // Has errors
      expect(result.validEntries).toHaveLength(2); // But has valid entries
      expect(result.validEntries[0].mieter_id).toBe('mieter-1');
      expect(result.validEntries[1].mieter_id).toBe('mieter-3');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors with entry indices', () => {
      const errors = [
        { field: 'mieter_id', message: 'Mieter ID ist erforderlich', entryIndex: 0 },
        { field: 'zaehlerstand', message: 'Zählerstand muss eine positive Zahl sein', entryIndex: 1 }
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe('Eintrag 1: Mieter ID ist erforderlich\nEintrag 2: Zählerstand muss eine positive Zahl sein');
    });

    it('should format errors without entry indices', () => {
      const errors = [
        { field: 'nebenkosten_id', message: 'Nebenkosten ID ist erforderlich' }
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe('Nebenkosten ID ist erforderlich');
    });

    it('should return empty string for no errors', () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe('');
    });
  });

  describe('prepareWasserzaehlerDataForSubmission', () => {
    it('should prepare data correctly', () => {
      const entries: WasserzaehlerFormEntry[] = [
        {
          mieter_id: 'mieter-1',
          mieter_name: 'Mieter 1',
          ablese_datum: '2024-01-15',
          zaehlerstand: '1234.5',
          verbrauch: '50.2'
        },
        {
          mieter_id: 'mieter-2',
          mieter_name: 'Mieter 2',
          ablese_datum: null,
          zaehlerstand: 2345.6,
          verbrauch: ''
        }
      ];

      const prepared = prepareWasserzaehlerDataForSubmission(entries);
      
      expect(prepared).toHaveLength(2);
      expect(prepared[0]).toEqual({
        mieter_id: 'mieter-1',
        ablese_datum: '2024-01-15',
        zaehlerstand: 1234.5,
        verbrauch: 50.2
      });
      expect(prepared[1]).toEqual({
        mieter_id: 'mieter-2',
        ablese_datum: null,
        zaehlerstand: 2345.6,
        verbrauch: 0
      });
    });
  });
});

describe('Performance Considerations', () => {
  it('should handle large datasets efficiently', () => {
    // Create a large dataset
    const entries: WasserzaehlerFormEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      mieter_id: `mieter-${i}`,
      mieter_name: `Mieter ${i}`,
      ablese_datum: '2024-01-15',
      zaehlerstand: 1000 + i,
      verbrauch: 50 + i
    }));

    const formData: WasserzaehlerFormData = {
      nebenkosten_id: 'test-nebenkosten-id',
      entries
    };

    const startTime = performance.now();
    const result = validateWasserzaehlerFormData(formData);
    const endTime = performance.now();

    expect(result.isValid).toBe(true);
    expect(result.validEntries).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
  });
});