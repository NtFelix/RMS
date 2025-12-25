import {
  validateWasserzaehlerEntry,
  validateWasserzaehlerFormData,
  formatValidationErrors,
  prepareWasserzaehlerDataForSubmission,
  ValidationError,
  ValidationResult
} from './wasserzaehler-validation';
import { WasserzaehlerFormEntry, WasserzaehlerFormData } from '@/lib/data-fetching';

describe('wasserzaehler-validation', () => {
  // Base valid entry for reuse with spread operator
  const createValidEntry = (overrides: Partial<WasserzaehlerFormEntry> = {}): WasserzaehlerFormEntry => ({
    mieter_id: 'tenant1',
    mieter_name: 'Test Tenant',
    ablese_datum: '2023-01-01',
    zaehlerstand: 100,
    verbrauch: 50,
    ...overrides
  });

  describe('validateWasserzaehlerEntry', () => {
    it('should validate a valid entry with no errors', () => {
      const entry = createValidEntry();
      expect(validateWasserzaehlerEntry(entry, 0)).toEqual([]);
    });

    it('should fail if mieter_id is missing', () => {
      const entry = createValidEntry({ mieter_id: '' });
      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toContainEqual(expect.objectContaining({ field: 'mieter_id' }));
    });

    it('should fail if mieter_id is only whitespace', () => {
      const entry = createValidEntry({ mieter_id: '   ' });
      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toContainEqual(expect.objectContaining({ field: 'mieter_id' }));
    });

    it('should fail if zaehlerstand is negative', () => {
      const entry = createValidEntry({ zaehlerstand: -10 });
      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toContainEqual(expect.objectContaining({ field: 'zaehlerstand' }));
    });

    it('should fail if zaehlerstand is empty string', () => {
      const entry = createValidEntry({ zaehlerstand: '' });
      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toContainEqual(expect.objectContaining({ field: 'zaehlerstand' }));
    });

    it('should accept zaehlerstand as string number', () => {
      const entry = createValidEntry({ zaehlerstand: '150' });
      expect(validateWasserzaehlerEntry(entry, 0)).toEqual([]);
    });

    it('should fail if ablese_datum is in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const entry = createValidEntry({ ablese_datum: futureDate.toISOString() });
      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toContainEqual(expect.objectContaining({ field: 'ablese_datum' }));
    });

    it('should accept null ablese_datum', () => {
      const entry = createValidEntry({ ablese_datum: null });
      expect(validateWasserzaehlerEntry(entry, 0)).toEqual([]);
    });

    it('should fail if verbrauch is negative', () => {
      const entry = createValidEntry({ verbrauch: -5 });
      const errors = validateWasserzaehlerEntry(entry, 0);
      expect(errors).toContainEqual(expect.objectContaining({ field: 'verbrauch' }));
    });

    it('should accept zero verbrauch', () => {
      const entry = createValidEntry({ verbrauch: 0 });
      expect(validateWasserzaehlerEntry(entry, 0)).toEqual([]);
    });

    it('should include entryIndex in errors', () => {
      const entry = createValidEntry({ mieter_id: '' });
      const errors = validateWasserzaehlerEntry(entry, 5);
      expect(errors[0].entryIndex).toBe(5);
    });
  });

  describe('validateWasserzaehlerFormData', () => {
    it('should validate a valid form data with no errors', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'nk123',
        entries: [createValidEntry()]
      };
      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validEntries).toHaveLength(1);
    });

    it('should fail if nebenkosten_id is missing', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: '',
        entries: [createValidEntry()]
      };
      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ field: 'nebenkosten_id' }));
    });

    it('should accept empty entries array', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'nk123',
        entries: []
      };
      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(true);
      expect(result.validEntries).toHaveLength(0);
    });

    it('should detect duplicate mieter_ids', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'nk123',
        entries: [
          createValidEntry({ mieter_id: 'tenant1' }),
          createValidEntry({ mieter_id: 'tenant1', mieter_name: 'Duplicate Tenant' })
        ]
      };
      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('tenant1') })
      );
    });

    it('should collect errors from all entries', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'nk123',
        entries: [
          createValidEntry({ mieter_id: '' }),
          createValidEntry({ mieter_id: 'tenant2', zaehlerstand: -5 })
        ]
      };
      const result = validateWasserzaehlerFormData(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should only include valid entries in validEntries', () => {
      const formData: WasserzaehlerFormData = {
        nebenkosten_id: 'nk123',
        entries: [
          createValidEntry({ mieter_id: 'valid_tenant' }),
          createValidEntry({ mieter_id: '' }) // Invalid
        ]
      };
      const result = validateWasserzaehlerFormData(formData);
      expect(result.validEntries).toHaveLength(1);
      expect(result.validEntries[0].mieter_id).toBe('valid_tenant');
    });
  });

  describe('formatValidationErrors', () => {
    it('should return empty string for no errors', () => {
      expect(formatValidationErrors([])).toBe('');
    });

    it('should format a single error without entry index', () => {
      const errors: ValidationError[] = [
        { field: 'nebenkosten_id', message: 'Nebenkosten ID ist erforderlich' }
      ];
      expect(formatValidationErrors(errors)).toBe('Nebenkosten ID ist erforderlich');
    });

    it('should format errors with entry index prefix', () => {
      const errors: ValidationError[] = [
        { field: 'mieter_id', message: 'Mieter ID ist erforderlich', entryIndex: 0 },
        { field: 'zaehlerstand', message: 'Zählerstand muss eine positive Zahl sein', entryIndex: 2 }
      ];
      const result = formatValidationErrors(errors);
      expect(result).toContain('Eintrag 1:');
      expect(result).toContain('Eintrag 3:');
    });

    it('should join multiple errors with newlines', () => {
      const errors: ValidationError[] = [
        { field: 'field1', message: 'Error 1' },
        { field: 'field2', message: 'Error 2' }
      ];
      const result = formatValidationErrors(errors);
      expect(result).toBe('Error 1\nError 2');
    });
  });

  describe('prepareWasserzaehlerDataForSubmission', () => {
    it('should prepare empty array for empty input', () => {
      expect(prepareWasserzaehlerDataForSubmission([])).toEqual([]);
    });

    it('should convert string values to numbers', () => {
      const entries: WasserzaehlerFormEntry[] = [
        createValidEntry({ zaehlerstand: '100', verbrauch: '50' })
      ];
      const result = prepareWasserzaehlerDataForSubmission(entries);
      expect(result[0].zaehlerstand).toBe(100);
      expect(result[0].verbrauch).toBe(50);
    });

    it('should keep numeric values as numbers', () => {
      const entries: WasserzaehlerFormEntry[] = [
        createValidEntry({ zaehlerstand: 200, verbrauch: 75 })
      ];
      const result = prepareWasserzaehlerDataForSubmission(entries);
      expect(result[0].zaehlerstand).toBe(200);
      expect(result[0].verbrauch).toBe(75);
    });

    it('should set null ablese_datum for empty string', () => {
      const entries: WasserzaehlerFormEntry[] = [
        createValidEntry({ ablese_datum: '' })
      ];
      const result = prepareWasserzaehlerDataForSubmission(entries);
      expect(result[0].ablese_datum).toBeNull();
    });

    it('should default verbrauch to 0 if not provided', () => {
      const entries: WasserzaehlerFormEntry[] = [
        createValidEntry({ verbrauch: '' })
      ];
      const result = prepareWasserzaehlerDataForSubmission(entries);
      expect(result[0].verbrauch).toBe(0);
    });

    it('should only include relevant fields for submission', () => {
      const entries: WasserzaehlerFormEntry[] = [createValidEntry()];
      const result = prepareWasserzaehlerDataForSubmission(entries);
      expect(Object.keys(result[0])).toEqual(['mieter_id', 'ablese_datum', 'zaehlerstand', 'verbrauch']);
      expect(result[0]).not.toHaveProperty('mieter_name');
    });
  });
});
