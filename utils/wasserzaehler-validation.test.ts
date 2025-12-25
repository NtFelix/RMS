
import { validateWasserzaehlerEntry, ValidationError } from './wasserzaehler-validation';

describe('wasserzaehler-validation', () => {
  describe('validateWasserzaehlerEntry', () => {
    it('should validate a valid entry', () => {
      const entry = {
        mieter_id: 'tenant1',
        zaehlerstand: 100,
        ablese_datum: '2023-01-01',
        verbrauch: 50
      };
      // Expect no errors
      expect(validateWasserzaehlerEntry(entry as any, 0)).toEqual([]);
    });

    it('should fail if mieter_id is missing', () => {
        const entry = {
            mieter_id: '',
            zaehlerstand: 100
        };
        const errors = validateWasserzaehlerEntry(entry as any, 0);
        expect(errors).toContainEqual(expect.objectContaining({ field: 'mieter_id' }));
    });

    it('should fail if zaehlerstand is invalid', () => {
        const entry = {
            mieter_id: 'tenant1',
            zaehlerstand: -10
        };
        const errors = validateWasserzaehlerEntry(entry as any, 0);
        expect(errors).toContainEqual(expect.objectContaining({ field: 'zaehlerstand' }));
    });

    it('should fail if ablese_datum is in future', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const entry = {
            mieter_id: 'tenant1',
            zaehlerstand: 100,
            ablese_datum: futureDate.toISOString()
        };
        const errors = validateWasserzaehlerEntry(entry as any, 0);
        expect(errors).toContainEqual(expect.objectContaining({ field: 'ablese_datum' }));
    });
  });
});
