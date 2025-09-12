import { 
  TEMPLATE_CATEGORIES, 
  MENTION_VARIABLES, 
  getMentionVariablesByCategory, 
  getMentionVariableById 
} from '../template-constants';

describe('Template Constants', () => {
  describe('TEMPLATE_CATEGORIES', () => {
    it('contains expected German template categories', () => {
      expect(TEMPLATE_CATEGORIES).toContain('Mail');
      expect(TEMPLATE_CATEGORIES).toContain('Brief');
      expect(TEMPLATE_CATEGORIES).toContain('Vertrag');
      expect(TEMPLATE_CATEGORIES).toContain('Rechnung');
      expect(TEMPLATE_CATEGORIES).toContain('Mahnung');
      expect(TEMPLATE_CATEGORIES).toContain('Kündigung');
      expect(TEMPLATE_CATEGORIES).toContain('Sonstiges');
    });

    it('has correct length', () => {
      expect(TEMPLATE_CATEGORIES).toHaveLength(7);
    });
  });

  describe('MENTION_VARIABLES', () => {
    it('contains all required variable categories', () => {
      const categories = [...new Set(MENTION_VARIABLES.map(v => v.category))];
      expect(categories).toContain('mieter');
      expect(categories).toContain('wohnung');
      expect(categories).toContain('haus');
      expect(categories).toContain('datum');
      expect(categories).toContain('vermieter');
    });

    it('has proper structure for each variable', () => {
      MENTION_VARIABLES.forEach(variable => {
        expect(variable).toHaveProperty('id');
        expect(variable).toHaveProperty('label');
        expect(variable).toHaveProperty('description');
        expect(variable).toHaveProperty('category');
        
        expect(typeof variable.id).toBe('string');
        expect(typeof variable.label).toBe('string');
        expect(typeof variable.description).toBe('string');
        expect(typeof variable.category).toBe('string');
      });
    });

    it('contains key tenant variables', () => {
      const tenantVariables = MENTION_VARIABLES.filter(v => v.category === 'mieter');
      const tenantIds = tenantVariables.map(v => v.id);
      
      expect(tenantIds).toContain('mieter.name');
      expect(tenantIds).toContain('mieter.email');
      expect(tenantIds).toContain('mieter.telefon');
    });

    it('contains key apartment variables', () => {
      const apartmentVariables = MENTION_VARIABLES.filter(v => v.category === 'wohnung');
      const apartmentIds = apartmentVariables.map(v => v.id);
      
      expect(apartmentIds).toContain('wohnung.adresse');
      expect(apartmentIds).toContain('wohnung.groesse');
      expect(apartmentIds).toContain('wohnung.zimmer');
    });
  });

  describe('getMentionVariablesByCategory', () => {
    it('returns all variables when no category provided', () => {
      const result = getMentionVariablesByCategory();
      expect(result).toEqual(MENTION_VARIABLES);
    });

    it('filters variables by category correctly', () => {
      const mieterVariables = getMentionVariablesByCategory('mieter');
      expect(mieterVariables.every(v => v.category === 'mieter')).toBe(true);
      expect(mieterVariables.length).toBeGreaterThan(0);
    });

    it('returns empty array for non-existent category', () => {
      const result = getMentionVariablesByCategory('nonexistent' as any);
      expect(result).toEqual([]);
    });
  });

  describe('getMentionVariableById', () => {
    it('finds variable by id correctly', () => {
      const variable = getMentionVariableById('mieter.name');
      expect(variable).toBeDefined();
      expect(variable?.id).toBe('mieter.name');
      expect(variable?.label).toBe('Mieter.Name');
    });

    it('returns undefined for non-existent id', () => {
      const variable = getMentionVariableById('nonexistent.id');
      expect(variable).toBeUndefined();
    });
  });
});