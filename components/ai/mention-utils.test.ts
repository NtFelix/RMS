import {
  filterMentionVariables,
  groupMentionVariablesByCategory,
  getUniqueCategories,
  searchMentionVariables,
  EnhancedMentionVariable,
  FilterOptions
} from '../../lib/mention-utils';
import { MentionVariable } from '../lib/template-constants';

// Test data
const mockVariables: EnhancedMentionVariable[] = [
  {
    id: 'mieter.name',
    label: 'Mieter.Name',
    description: 'Vollständiger Name des Mieters',
    category: 'mieter',
    keywords: ['tenant', 'name', 'vollname']
  },
  {
    id: 'mieter.email',
    label: 'Mieter.Email',
    description: 'E-Mail-Adresse des Mieters',
    category: 'mieter',
    keywords: ['email', 'mail', 'kontakt']
  },
  {
    id: 'wohnung.adresse',
    label: 'Wohnung.Adresse',
    description: 'Vollständige Adresse der Wohnung',
    category: 'wohnung',
    keywords: ['address', 'anschrift']
  },
  {
    id: 'wohnung.groesse',
    label: 'Wohnung.Größe',
    description: 'Größe der Wohnung in m²',
    category: 'wohnung',
    keywords: ['size', 'quadratmeter', 'fläche']
  },
  {
    id: 'datum.heute',
    label: 'Datum.Heute',
    description: 'Heutiges Datum (DD.MM.YYYY)',
    category: 'datum',
    keywords: ['today', 'current', 'aktuell']
  },
  {
    id: 'vermieter.name',
    label: 'Vermieter.Name',
    description: 'Name des Vermieters',
    category: 'vermieter',
    keywords: ['landlord', 'owner']
  }
];

describe('filterMentionVariables', () => {
  describe('basic filtering', () => {
    it('should return all variables when query is empty', () => {
      const result = filterMentionVariables(mockVariables, '');
      expect(result).toHaveLength(mockVariables.length);
      expect(result).toEqual(mockVariables);
    });

    it('should return all variables when query is only whitespace', () => {
      const result = filterMentionVariables(mockVariables, '   ');
      expect(result).toHaveLength(mockVariables.length);
    });

    it('should filter by label (case-insensitive)', () => {
      const result = filterMentionVariables(mockVariables, 'mieter');
      expect(result).toHaveLength(3); // mieter.name, mieter.email, and vermieter.name
      expect(result.every(v => v.label.toLowerCase().includes('mieter'))).toBe(true);
    });

    it('should filter by description (case-insensitive)', () => {
      const result = filterMentionVariables(mockVariables, 'adresse');
      expect(result).toHaveLength(2); // wohnung.adresse and mieter.email (E-Mail-Adresse)
    });

    it('should filter by keywords', () => {
      const result = filterMentionVariables(mockVariables, 'tenant');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mieter.name');
    });

    it('should be case-insensitive for all searches', () => {
      const result1 = filterMentionVariables(mockVariables, 'MIETER');
      const result2 = filterMentionVariables(mockVariables, 'mieter');
      expect(result1).toEqual(result2);
    });
  });

  describe('category filtering', () => {
    it('should filter by category when specified', () => {
      const options: FilterOptions = { category: 'mieter' };
      const result = filterMentionVariables(mockVariables, '', options);
      expect(result).toHaveLength(2);
      expect(result.every(v => v.category === 'mieter')).toBe(true);
    });

    it('should combine query and category filtering', () => {
      const options: FilterOptions = { category: 'mieter' };
      const result = filterMentionVariables(mockVariables, 'email', options);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mieter.email');
    });

    it('should return empty array for non-existent category', () => {
      const options: FilterOptions = { category: 'nonexistent' };
      const result = filterMentionVariables(mockVariables, '', options);
      expect(result).toHaveLength(0);
    });
  });

  describe('exact match prioritization', () => {
    it('should prioritize exact label matches', () => {
      const testVariables: MentionVariable[] = [
        { id: 'test1', label: 'Name Test', description: 'Test description', category: 'test' },
        { id: 'test2', label: 'Name', description: 'Exact match', category: 'test' },
        { id: 'test3', label: 'Test Name', description: 'Another test', category: 'test' }
      ];
      
      const result = filterMentionVariables(testVariables, 'name');
      expect(result[0].id).toBe('test2'); // Exact match should be first
    });

    it('should prioritize exact keyword matches', () => {
      const testVariables: EnhancedMentionVariable[] = [
        { 
          id: 'test1', 
          label: 'Test Label', 
          description: 'Test description', 
          category: 'test',
          keywords: ['testing', 'sample']
        },
        { 
          id: 'test2', 
          label: 'Another Label', 
          description: 'Another description', 
          category: 'test',
          keywords: ['test', 'exact']
        }
      ];
      
      const result = filterMentionVariables(testVariables, 'test');
      expect(result[0].id).toBe('test2'); // Exact keyword match should be first
    });

    it('should prioritize label starts with query', () => {
      const testVariables: MentionVariable[] = [
        { id: 'test1', label: 'Contains Name', description: 'Test description', category: 'test' },
        { id: 'test2', label: 'Name Starts', description: 'Another test', category: 'test' }
      ];
      
      const result = filterMentionVariables(testVariables, 'name');
      expect(result[0].id).toBe('test2'); // Starts with should be prioritized
    });

    it('should disable prioritization when option is false', () => {
      const options: FilterOptions = { prioritizeExactMatches: false };
      const result = filterMentionVariables(mockVariables, 'name', options);
      
      // Should maintain original order when no prioritization
      const originalOrder = mockVariables.filter(v => 
        v.label.toLowerCase().includes('name') || 
        v.description.toLowerCase().includes('name') ||
        (v as EnhancedMentionVariable).keywords?.some(k => k.toLowerCase().includes('name'))
      );
      
      expect(result).toEqual(originalOrder);
    });
  });

  describe('edge cases', () => {
    it('should handle empty variables array', () => {
      const result = filterMentionVariables([], 'test');
      expect(result).toHaveLength(0);
    });

    it('should handle variables without keywords', () => {
      const variablesWithoutKeywords: MentionVariable[] = [
        { id: 'test1', label: 'Test Label', description: 'Test description', category: 'test' }
      ];
      
      const result = filterMentionVariables(variablesWithoutKeywords, 'test');
      expect(result).toHaveLength(1);
    });

    it('should handle variables without category', () => {
      const variablesWithoutCategory: MentionVariable[] = [
        { id: 'test1', label: 'Test Label', description: 'Test description' }
      ];
      
      const result = filterMentionVariables(variablesWithoutCategory, 'test');
      expect(result).toHaveLength(1);
    });

    it('should handle special characters in query', () => {
      const result = filterMentionVariables(mockVariables, 'm²');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wohnung.groesse');
    });
  });
});

describe('groupMentionVariablesByCategory', () => {
  it('should group variables by category', () => {
    const result = groupMentionVariablesByCategory(mockVariables);
    
    expect(result.mieter).toHaveLength(2);
    expect(result.wohnung).toHaveLength(2);
    expect(result.datum).toHaveLength(1);
    expect(result.vermieter).toHaveLength(1);
  });

  it('should handle variables without category', () => {
    const variablesWithoutCategory: MentionVariable[] = [
      { id: 'test1', label: 'Test', description: 'Test' }
    ];
    
    const result = groupMentionVariablesByCategory(variablesWithoutCategory);
    expect(result.uncategorized).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const result = groupMentionVariablesByCategory([]);
    expect(result).toEqual({});
  });
});

describe('getUniqueCategories', () => {
  it('should return unique categories', () => {
    const result = getUniqueCategories(mockVariables);
    
    expect(result).toContain('mieter');
    expect(result).toContain('wohnung');
    expect(result).toContain('datum');
    expect(result).toContain('vermieter');
    expect(result).toHaveLength(4);
  });

  it('should filter out undefined categories', () => {
    const variablesWithUndefined: MentionVariable[] = [
      { id: 'test1', label: 'Test', description: 'Test', category: 'test' },
      { id: 'test2', label: 'Test2', description: 'Test2' }
    ];
    
    const result = getUniqueCategories(variablesWithUndefined);
    expect(result).toEqual(['test']);
  });

  it('should handle empty array', () => {
    const result = getUniqueCategories([]);
    expect(result).toEqual([]);
  });
});

describe('searchMentionVariables', () => {
  it('should return comprehensive search results', () => {
    const result = searchMentionVariables(mockVariables, 'mieter');
    
    expect(result.variables).toHaveLength(3); // mieter.name, mieter.email, and vermieter.name
    expect(result.grouped.mieter).toHaveLength(2);
    expect(result.grouped.vermieter).toHaveLength(1);
    expect(result.categories).toContain('mieter');
    expect(result.categories).toContain('vermieter');
    expect(result.total).toBe(3);
  });

  it('should handle empty query', () => {
    const result = searchMentionVariables(mockVariables, '');
    
    expect(result.variables).toHaveLength(mockVariables.length);
    expect(result.total).toBe(mockVariables.length);
    expect(result.categories).toHaveLength(4);
  });

  it('should handle no matches', () => {
    const result = searchMentionVariables(mockVariables, 'nonexistent');
    
    expect(result.variables).toHaveLength(0);
    expect(result.grouped).toEqual({});
    expect(result.categories).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should work with category filtering', () => {
    const options: FilterOptions = { category: 'wohnung' };
    const result = searchMentionVariables(mockVariables, 'adresse', options);
    
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0].id).toBe('wohnung.adresse');
    expect(result.categories).toEqual(['wohnung']);
  });
});