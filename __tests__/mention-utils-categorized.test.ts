import { 
  groupMentionVariablesByCategory, 
  getOrderedCategories,
  searchMentionVariables 
} from '@/lib/mention-utils';
import { MENTION_VARIABLES, CATEGORY_CONFIGS } from '@/lib/template-constants';

describe('Mention Utils - Categorized Display', () => {
  describe('groupMentionVariablesByCategory', () => {
    it('should group variables by category', () => {
      const testVariables = MENTION_VARIABLES.slice(0, 6); // Mix of categories
      const grouped = groupMentionVariablesByCategory(testVariables);
      
      expect(grouped).toHaveProperty('mieter');
      expect(grouped).toHaveProperty('wohnung');
      expect(grouped.mieter.length).toBeGreaterThan(0);
      expect(grouped.wohnung.length).toBeGreaterThan(0);
    });

    it('should sort variables within each category alphabetically', () => {
      const testVariables = [
        { id: 'mieter.z', label: 'Z Label', description: 'Z desc', category: 'mieter' as const },
        { id: 'mieter.a', label: 'A Label', description: 'A desc', category: 'mieter' as const },
        { id: 'mieter.m', label: 'M Label', description: 'M desc', category: 'mieter' as const },
      ];
      
      const grouped = groupMentionVariablesByCategory(testVariables);
      const mieterVariables = grouped.mieter;
      
      expect(mieterVariables[0].label).toBe('A Label');
      expect(mieterVariables[1].label).toBe('M Label');
      expect(mieterVariables[2].label).toBe('Z Label');
    });

    it('should handle variables without category', () => {
      const testVariables = [
        { id: 'test.1', label: 'Test 1', description: 'Test desc' },
        { id: 'mieter.name', label: 'Mieter.Name', description: 'Mieter desc', category: 'mieter' as const },
      ];
      
      const grouped = groupMentionVariablesByCategory(testVariables);
      
      expect(grouped).toHaveProperty('uncategorized');
      expect(grouped).toHaveProperty('mieter');
      expect(grouped.uncategorized.length).toBe(1);
      expect(grouped.mieter.length).toBe(1);
    });
  });

  describe('getOrderedCategories', () => {
    it('should return categories in order defined by CATEGORY_CONFIGS', () => {
      const groupedVariables = {
        vermieter: [],
        mieter: [],
        haus: [],
        wohnung: [],
        datum: [],
      };
      
      const orderedCategories = getOrderedCategories(groupedVariables);
      
      // Should follow the order: mieter (1), wohnung (2), haus (3), datum (4), vermieter (5)
      expect(orderedCategories[0]).toBe('mieter');
      expect(orderedCategories[1]).toBe('wohnung');
      expect(orderedCategories[2]).toBe('haus');
      expect(orderedCategories[3]).toBe('datum');
      expect(orderedCategories[4]).toBe('vermieter');
    });

    it('should handle missing categories gracefully', () => {
      const groupedVariables = {
        mieter: [],
        haus: [], // Missing wohnung
        datum: [],
      };
      
      const orderedCategories = getOrderedCategories(groupedVariables);
      
      expect(orderedCategories).toEqual(['mieter', 'haus', 'datum']);
      expect(orderedCategories).not.toContain('wohnung');
    });

    it('should put uncategorized items at the end', () => {
      const groupedVariables = {
        uncategorized: [],
        mieter: [],
        unknown_category: [],
        wohnung: [],
      };
      
      const orderedCategories = getOrderedCategories(groupedVariables);
      
      // Known categories should come first in order
      expect(orderedCategories[0]).toBe('mieter');
      expect(orderedCategories[1]).toBe('wohnung');
      
      // Unknown categories should come at the end
      expect(orderedCategories).toContain('uncategorized');
      expect(orderedCategories).toContain('unknown_category');
      expect(orderedCategories.indexOf('uncategorized')).toBeGreaterThan(1);
      expect(orderedCategories.indexOf('unknown_category')).toBeGreaterThan(1);
    });
  });

  describe('searchMentionVariables', () => {
    it('should return properly ordered categories in search results', () => {
      const result = searchMentionVariables(MENTION_VARIABLES, '');
      
      expect(result.categories[0]).toBe('mieter');
      expect(result.categories[1]).toBe('wohnung');
      expect(result.categories[2]).toBe('haus');
      expect(result.categories[3]).toBe('datum');
      expect(result.categories[4]).toBe('vermieter');
    });

    it('should maintain category order even with filtered results', () => {
      // Search for something that appears in multiple categories
      const result = searchMentionVariables(MENTION_VARIABLES, 'name');
      
      // Should still maintain proper category order
      const mieterIndex = result.categories.indexOf('mieter');
      const hausIndex = result.categories.indexOf('haus');
      const vermieterIndex = result.categories.indexOf('vermieter');
      
      if (mieterIndex !== -1 && hausIndex !== -1) {
        expect(mieterIndex).toBeLessThan(hausIndex);
      }
      if (hausIndex !== -1 && vermieterIndex !== -1) {
        expect(hausIndex).toBeLessThan(vermieterIndex);
      }
    });

    it('should include grouped variables in correct format', () => {
      const result = searchMentionVariables(MENTION_VARIABLES.slice(0, 8), '');
      
      expect(result.grouped).toBeDefined();
      expect(result.variables).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(result.total).toBe(8);
      
      // Check that grouped structure is correct
      Object.keys(result.grouped).forEach(category => {
        expect(Array.isArray(result.grouped[category])).toBe(true);
      });
    });
  });

  describe('CATEGORY_CONFIGS', () => {
    it('should have all required properties for each category', () => {
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

    it('should have unique order values', () => {
      const orders = Object.values(CATEGORY_CONFIGS).map(config => config.order);
      const uniqueOrders = new Set(orders);
      
      expect(uniqueOrders.size).toBe(orders.length);
    });

    it('should cover all mention variable categories', () => {
      const mentionCategories = new Set(
        MENTION_VARIABLES
          .map(variable => variable.category)
          .filter(Boolean)
      );
      
      const configCategories = new Set(Object.keys(CATEGORY_CONFIGS));
      
      mentionCategories.forEach(category => {
        expect(configCategories.has(category!)).toBe(true);
      });
    });
  });
});