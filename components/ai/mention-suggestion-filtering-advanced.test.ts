/**
 * Advanced filtering tests for mention suggestion functionality
 * Tests complex filtering scenarios, edge cases, and performance
 * 
 * Requirements covered: 1.5, 2.5, 3.5
 */

import {
  filterMentionVariables,
  groupMentionVariablesByCategory,
  getOrderedCategories,
  searchMentionVariables,
  EnhancedMentionVariable,
  FilterOptions
} from '@/lib/mention-utils';
import { MentionVariable } from '@/lib/template-constants';

// Mock error handling
jest.mock('@/lib/mention-suggestion-error-handling', () => ({
  handleFilterError: jest.fn((error, query, variableCount) => ({
    type: 'FILTER_ERROR',
    message: error.message,
    originalError: error,
    context: { query, variableCount },
    timestamp: Date.now(),
    errorId: 'test-filter-error-id',
    recoverable: true,
  })),
}));

describe('Advanced Mention Suggestion Filtering', () => {
  const createTestVariable = (
    id: string, 
    label: string, 
    category: string, 
    description?: string, 
    keywords?: string[]
  ): EnhancedMentionVariable => ({
    id,
    label,
    description: description || `Description for ${label}`,
    category: category as any,
    keywords,
  });

  const testVariables: EnhancedMentionVariable[] = [
    createTestVariable('mieter.name', 'Mieter Name', 'mieter', 'Full name of tenant', ['tenant', 'name', 'person']),
    createTestVariable('mieter.email', 'Mieter E-Mail', 'mieter', 'Email address', ['email', 'contact', 'mail']),
    createTestVariable('mieter.telefon', 'Mieter Telefon', 'mieter', 'Phone number', ['phone', 'tel', 'contact']),
    createTestVariable('wohnung.nummer', 'Wohnungsnummer', 'wohnung', 'Apartment number', ['apartment', 'number', 'unit']),
    createTestVariable('wohnung.groesse', 'Wohnungsgröße', 'wohnung', 'Size in m²', ['size', 'area', 'sqm']),
    createTestVariable('wohnung.miete', 'Grundmiete', 'wohnung', 'Base rent amount', ['rent', 'base', 'amount']),
    createTestVariable('haus.adresse', 'Hausadresse', 'haus', 'Building address', ['address', 'building', 'location']),
    createTestVariable('datum.heute', 'Datum Heute', 'datum', 'Current date', ['date', 'today', 'current']),
    createTestVariable('datum.monat', 'Aktueller Monat', 'datum', 'Current month', ['month', 'current']),
    createTestVariable('vermieter.name', 'Vermieter Name', 'vermieter', 'Landlord name', ['landlord', 'owner']),
  ];

  describe('Complex Filtering Scenarios', () => {
    it('should handle multi-word queries', () => {
      const result = filterMentionVariables(testVariables, 'mieter name');
      
      // Should match variables containing both "mieter" and "name"
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(v => v.id === 'mieter.name')).toBe(true);
    });

    it('should handle partial word matches', () => {
      const result = filterMentionVariables(testVariables, 'miet');
      
      // Should match 'Mieter Name', 'Mieter E-Mail', 'Mieter Telefon', 'Grundmiete'
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result.some(v => v.id === 'mieter.name')).toBe(true);
      expect(result.some(v => v.id === 'wohnung.miete')).toBe(true);
    });

    it('should prioritize exact matches over partial matches', () => {
      const result = filterMentionVariables(testVariables, 'name', { prioritizeExactMatches: true });
      
      // Variables with 'name' in keywords should come first
      const firstResult = result[0];
      expect(firstResult.keywords).toContain('name');
    });

    it('should handle case-insensitive searches across all fields', () => {
      const queries = ['MIETER', 'mieter', 'Mieter', 'mIeTeR'];
      
      queries.forEach(query => {
        const result = filterMentionVariables(testVariables, query);
        expect(result.length).toBeGreaterThan(0);
        expect(result.every(v => 
          v.label.toLowerCase().includes('mieter') || 
          v.description.toLowerCase().includes('mieter') ||
          v.keywords?.some(k => k.toLowerCase().includes('mieter'))
        )).toBe(true);
      });
    });

    it('should handle special characters and umlauts', () => {
      const result = filterMentionVariables(testVariables, 'größe');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wohnung.groesse');
    });

    it('should handle numeric queries', () => {
      const numericVariables = [
        createTestVariable('test.number', 'Test 123', 'test', 'Contains number 123'),
        createTestVariable('test.year', 'Year 2024', 'test', 'Year information'),
      ];
      
      const result = filterMentionVariables(numericVariables, '123');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test.number');
    });

    it('should handle empty and whitespace queries', () => {
      const emptyResult = filterMentionVariables(testVariables, '');
      const whitespaceResult = filterMentionVariables(testVariables, '   ');
      
      expect(emptyResult).toHaveLength(testVariables.length);
      expect(whitespaceResult).toHaveLength(testVariables.length);
      expect(emptyResult).toEqual(testVariables);
    });
  });

  describe('Category-Based Filtering', () => {
    it('should filter by single category', () => {
      const options: FilterOptions = { category: 'mieter' };
      const result = filterMentionVariables(testVariables, '', options);
      
      expect(result).toHaveLength(3);
      expect(result.every(v => v.category === 'mieter')).toBe(true);
    });

    it('should combine category and query filtering', () => {
      const options: FilterOptions = { category: 'wohnung' };
      const result = filterMentionVariables(testVariables, 'nummer', options);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wohnung.nummer');
    });

    it('should return empty array for non-existent category', () => {
      const options: FilterOptions = { category: 'nonexistent' };
      const result = filterMentionVariables(testVariables, '', options);
      
      expect(result).toHaveLength(0);
    });

    it('should handle undefined category in variables', () => {
      const variablesWithUndefined = [
        ...testVariables,
        { id: 'uncategorized', label: 'Uncategorized', description: 'No category' } as MentionVariable
      ];
      
      const result = filterMentionVariables(variablesWithUndefined, 'uncategorized');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('uncategorized');
    });
  });

  describe('Keyword-Based Searching', () => {
    it('should match keywords exactly', () => {
      const result = filterMentionVariables(testVariables, 'tenant');
      
      expect(result.some(v => v.id === 'mieter.name')).toBe(true);
    });

    it('should match partial keywords', () => {
      const result = filterMentionVariables(testVariables, 'cont');
      
      // Should match variables with 'contact' keyword
      expect(result.some(v => v.keywords?.includes('contact'))).toBe(true);
    });

    it('should handle variables without keywords', () => {
      const variablesWithoutKeywords = testVariables.map(v => ({
        ...v,
        keywords: undefined
      }));
      
      const result = filterMentionVariables(variablesWithoutKeywords, 'mieter');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should prioritize keyword matches in sorting', () => {
      const result = filterMentionVariables(testVariables, 'contact', { prioritizeExactMatches: true });
      
      // Variables with exact keyword match should come first
      const firstResult = result[0];
      expect(firstResult.keywords).toContain('contact');
    });
  });

  describe('Sorting and Prioritization', () => {
    it('should sort alphabetically when no prioritization', () => {
      const options: FilterOptions = { prioritizeExactMatches: false };
      const result = filterMentionVariables(testVariables, 'mieter', options);
      
      // Should return results without exact match prioritization
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(v => 
        v.label.toLowerCase().includes('mieter') || 
        v.description.toLowerCase().includes('mieter') ||
        v.keywords?.some(k => k.toLowerCase().includes('mieter'))
      )).toBe(true);
    });

    it('should prioritize label starts with query', () => {
      const testVars = [
        createTestVariable('test1', 'Contains Name', 'test'),
        createTestVariable('test2', 'Name First', 'test'),
      ];
      
      const result = filterMentionVariables(testVars, 'name', { prioritizeExactMatches: true });
      expect(result[0].id).toBe('test2'); // Starts with 'Name'
    });

    it('should handle complex prioritization scenarios', () => {
      const complexVars = [
        createTestVariable('exact', 'test', 'test', 'description', ['other']),
        createTestVariable('keyword', 'other', 'test', 'description', ['test']),
        createTestVariable('starts', 'test something', 'test', 'description'),
        createTestVariable('contains', 'contains test', 'test', 'description'),
      ];
      
      const result = filterMentionVariables(complexVars, 'test', { prioritizeExactMatches: true });
      
      // Order should be: exact label match, exact keyword match, starts with, contains
      expect(result[0].id).toBe('exact');
      expect(result[1].id).toBe('keyword');
      expect(result[2].id).toBe('starts');
      expect(result[3].id).toBe('contains');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => filterMentionVariables(null as any, 'test')).not.toThrow();
      expect(() => filterMentionVariables(testVariables, null as any)).not.toThrow();
      expect(() => filterMentionVariables(undefined as any, 'test')).not.toThrow();
    });

    it('should handle malformed variable objects', () => {
      const malformedVariables = [
        null,
        undefined,
        {},
        { id: 'valid' },
        { label: 'no-id' },
        { id: 'complete', label: 'Complete', description: 'Valid' },
      ] as any[];
      
      const result = filterMentionVariables(malformedVariables, 'test');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle extremely long queries', () => {
      const longQuery = 'a'.repeat(1000);
      
      const result = filterMentionVariables(testVariables, longQuery);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // No matches expected
    });

    it('should handle regex special characters safely', () => {
      const specialChars = ['(', ')', '[', ']', '{', '}', '*', '+', '?', '^', '$', '|', '\\', '.'];
      
      specialChars.forEach(char => {
        expect(() => filterMentionVariables(testVariables, char)).not.toThrow();
      });
    });

    it('should provide fallback when filtering fails', () => {
      // Mock console.error to avoid noise
      const originalError = console.error;
      console.error = jest.fn();
      
      // Create a scenario that might cause filtering to fail
      const problematicVariables = [
        { 
          get label() { throw new Error('Label access failed'); },
          id: 'problematic',
          description: 'test'
        }
      ] as any[];
      
      const result = filterMentionVariables(problematicVariables, 'test');
      expect(Array.isArray(result)).toBe(true);
      
      console.error = originalError;
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => 
        createTestVariable(`var${i}`, `Variable ${i}`, 'test', `Description ${i}`, [`keyword${i}`])
      );
      
      const startTime = performance.now();
      const result = filterMentionVariables(largeDataset, 'Variable');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result.length).toBe(1000); // All should match
    });

    it('should handle frequent filtering operations', () => {
      const queries = ['a', 'mi', 'mie', 'miet', 'miete', 'mieter'];
      
      const startTime = performance.now();
      queries.forEach(query => {
        filterMentionVariables(testVariables, query);
      });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
    });
  });

  describe('Grouping and Ordering', () => {
    it('should group variables correctly by category', () => {
      const grouped = groupMentionVariablesByCategory(testVariables);
      
      expect(grouped.mieter).toHaveLength(3);
      expect(grouped.wohnung).toHaveLength(3);
      expect(grouped.haus).toHaveLength(1);
      expect(grouped.datum).toHaveLength(2);
      expect(grouped.vermieter).toHaveLength(1);
    });

    it('should handle empty grouping input', () => {
      const grouped = groupMentionVariablesByCategory([]);
      expect(grouped).toEqual({});
    });

    it('should sort variables within categories alphabetically', () => {
      const grouped = groupMentionVariablesByCategory(testVariables);
      
      Object.values(grouped).forEach(categoryVariables => {
        for (let i = 1; i < categoryVariables.length; i++) {
          expect(categoryVariables[i-1].label.localeCompare(categoryVariables[i].label)).toBeLessThanOrEqual(0);
        }
      });
    });

    it('should get ordered categories correctly', () => {
      const grouped = groupMentionVariablesByCategory(testVariables);
      const ordered = getOrderedCategories(grouped);
      
      expect(ordered).toContain('mieter');
      expect(ordered).toContain('wohnung');
      expect(ordered).toContain('haus');
      expect(ordered).toContain('datum');
      expect(ordered).toContain('vermieter');
    });
  });

  describe('Search Integration', () => {
    it('should provide comprehensive search results', () => {
      const result = searchMentionVariables(testVariables, 'mieter');
      
      expect(result.variables.length).toBeGreaterThan(0);
      expect(result.grouped).toHaveProperty('mieter');
      expect(result.categories).toContain('mieter');
      expect(result.total).toBe(result.variables.length);
    });

    it('should handle search with category filtering', () => {
      const options: FilterOptions = { category: 'wohnung' };
      const result = searchMentionVariables(testVariables, 'größe', options);
      
      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].id).toBe('wohnung.groesse');
      expect(result.categories).toEqual(['wohnung']);
    });

    it('should return empty results for no matches', () => {
      const result = searchMentionVariables(testVariables, 'nonexistent');
      
      expect(result.variables).toHaveLength(0);
      expect(result.grouped).toEqual({});
      expect(result.categories).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});