import { 
  TEMPLATE_CATEGORIES, 
  MENTION_VARIABLES, 
  CATEGORY_CONFIGS,
  getMentionVariablesByCategory, 
  getMentionVariableById,
  getCategoryConfig,
  getSortedCategories,
  filterMentionVariables,
  groupMentionVariablesByCategory,
  getAvailableCategories,
  searchMentionVariables,
  getVariableIcon,
  isValidMentionVariable
} from './template-constants';

describe('Template Constants', () => {
  describe('TEMPLATE_CATEGORIES', () => {
    it('contains expected German template categories', () => {
      expect(TEMPLATE_CATEGORIES).toContain('Mail');
      expect(TEMPLATE_CATEGORIES).toContain('Dokumente');
      expect(TEMPLATE_CATEGORIES).toContain('Sonstiges');
    });

    it('has correct length', () => {
      expect(TEMPLATE_CATEGORIES).toHaveLength(3);
    });

    it('is a readonly array', () => {
      expect(Array.isArray(TEMPLATE_CATEGORIES)).toBe(true);
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
        
        // Check optional properties
        if (variable.keywords) {
          expect(Array.isArray(variable.keywords)).toBe(true);
          variable.keywords.forEach(keyword => {
            expect(typeof keyword).toBe('string');
          });
        }
        
        if (variable.icon) {
          expect(typeof variable.icon).toBe('string');
        }
      });
    });

    it('has enhanced metadata for better searchability', () => {
      const variablesWithKeywords = MENTION_VARIABLES.filter(v => v.keywords && v.keywords.length > 0);
      expect(variablesWithKeywords.length).toBeGreaterThan(0);
      
      const variablesWithIcons = MENTION_VARIABLES.filter(v => v.icon);
      expect(variablesWithIcons.length).toBeGreaterThan(0);
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

  describe('CATEGORY_CONFIGS', () => {
    it('contains all expected categories', () => {
      expect(CATEGORY_CONFIGS).toHaveProperty('mieter');
      expect(CATEGORY_CONFIGS).toHaveProperty('wohnung');
      expect(CATEGORY_CONFIGS).toHaveProperty('haus');
      expect(CATEGORY_CONFIGS).toHaveProperty('datum');
      expect(CATEGORY_CONFIGS).toHaveProperty('vermieter');
    });

    it('has proper structure for each category config', () => {
      Object.values(CATEGORY_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('id');
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('order');
        
        expect(typeof config.id).toBe('string');
        expect(typeof config.label).toBe('string');
        expect(typeof config.icon).toBe('string');
        expect(typeof config.color).toBe('string');
        expect(typeof config.order).toBe('number');
      });
    });
  });

  describe('getCategoryConfig', () => {
    it('returns correct category config', () => {
      const config = getCategoryConfig('mieter');
      expect(config).toBeDefined();
      expect(config?.id).toBe('mieter');
      expect(config?.label).toBe('Mieter');
    });

    it('returns undefined for non-existent category', () => {
      const config = getCategoryConfig('nonexistent');
      expect(config).toBeUndefined();
    });
  });

  describe('getSortedCategories', () => {
    it('returns categories sorted by order', () => {
      const sorted = getSortedCategories();
      expect(sorted.length).toBe(Object.keys(CATEGORY_CONFIGS).length);
      
      // Check if sorted by order
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].order).toBeGreaterThanOrEqual(sorted[i - 1].order);
      }
    });
  });

  describe('filterMentionVariables', () => {
    it('returns all variables when query is empty', () => {
      const result = filterMentionVariables(MENTION_VARIABLES, '');
      expect(result).toEqual(MENTION_VARIABLES);
    });

    it('filters by label correctly', () => {
      const result = filterMentionVariables(MENTION_VARIABLES, 'name');
      expect(result.length).toBeGreaterThan(0);
      // Should find variables that have 'name' in label, description, or keywords
      expect(result.every(v => 
        v.label.toLowerCase().includes('name') ||
        v.description.toLowerCase().includes('name') ||
        v.keywords?.some(k => k.toLowerCase().includes('name'))
      )).toBe(true);
    });

    it('filters by description correctly', () => {
      const result = filterMentionVariables(MENTION_VARIABLES, 'telefon');
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(v => v.description.toLowerCase().includes('telefon'))).toBe(true);
    });

    it('filters by keywords correctly', () => {
      const result = filterMentionVariables(MENTION_VARIABLES, 'phone');
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(v => v.keywords?.some(k => k.includes('phone')))).toBe(true);
    });
  });

  describe('groupMentionVariablesByCategory', () => {
    it('groups variables by category correctly', () => {
      const grouped = groupMentionVariablesByCategory(MENTION_VARIABLES);
      
      expect(grouped).toHaveProperty('mieter');
      expect(grouped).toHaveProperty('wohnung');
      expect(grouped).toHaveProperty('haus');
      expect(grouped).toHaveProperty('datum');
      expect(grouped).toHaveProperty('vermieter');
      
      // Check that all variables in each group have the correct category
      Object.entries(grouped).forEach(([category, variables]) => {
        variables.forEach(variable => {
          expect(variable.category).toBe(category);
        });
      });
    });
  });

  describe('getAvailableCategories', () => {
    it('returns all unique categories from variables', () => {
      const categories = getAvailableCategories();
      expect(categories).toContain('mieter');
      expect(categories).toContain('wohnung');
      expect(categories).toContain('haus');
      expect(categories).toContain('datum');
      expect(categories).toContain('vermieter');
    });

    it('works with custom variable list', () => {
      const customVariables = MENTION_VARIABLES.filter(v => v.category === 'mieter');
      const categories = getAvailableCategories(customVariables);
      expect(categories).toEqual(['mieter']);
    });
  });

  describe('searchMentionVariables', () => {
    it('prioritizes exact matches over partial matches', () => {
      const result = searchMentionVariables('name');
      expect(result.length).toBeGreaterThan(0);
      
      // First results should be exact matches
      const firstResult = result[0];
      expect(
        firstResult.label.toLowerCase() === 'name' ||
        firstResult.keywords?.includes('name')
      ).toBe(true);
    });

    it('returns empty array for no matches', () => {
      const result = searchMentionVariables('nonexistentterm');
      expect(result).toEqual([]);
    });
  });

  describe('getVariableIcon', () => {
    it('returns variable icon when available', () => {
      const variable = MENTION_VARIABLES.find(v => v.icon);
      if (variable) {
        const icon = getVariableIcon(variable);
        expect(icon).toBe(variable.icon);
      }
    });

    it('falls back to category icon when variable icon not available', () => {
      const variableWithoutIcon = { ...MENTION_VARIABLES[0] };
      delete variableWithoutIcon.icon;
      
      const icon = getVariableIcon(variableWithoutIcon);
      const categoryConfig = getCategoryConfig(variableWithoutIcon.category || '');
      expect(icon).toBe(categoryConfig?.icon || 'Hash');
    });

    it('falls back to Hash icon when no category config available', () => {
      const variableWithoutCategory = { 
        ...MENTION_VARIABLES[0], 
        category: undefined as any 
      };
      delete variableWithoutCategory.icon;
      
      const icon = getVariableIcon(variableWithoutCategory);
      expect(icon).toBe('Hash');
    });
  });

  describe('isValidMentionVariable', () => {
    it('validates correct mention variable structure', () => {
      const validVariable = MENTION_VARIABLES[0];
      expect(isValidMentionVariable(validVariable)).toBe(true);
    });

    it('rejects invalid structures', () => {
      expect(isValidMentionVariable(null)).toBe(false);
      expect(isValidMentionVariable({})).toBe(false);
      expect(isValidMentionVariable({ id: 'test' })).toBe(false);
      expect(isValidMentionVariable({ 
        id: 'test', 
        label: 'Test', 
        description: 'Test desc',
        keywords: 'invalid' // should be array
      })).toBe(false);
    });

    it('accepts valid structure with optional properties', () => {
      const validVariable = {
        id: 'test.id',
        label: 'Test Label',
        description: 'Test description',
        category: 'mieter' as const,
        keywords: ['test', 'keyword'],
        icon: 'TestIcon'
      };
      expect(isValidMentionVariable(validVariable)).toBe(true);
    });
  });
});