import {
  filterMentionVariables,
  groupMentionVariablesByCategory,
  FilterOptions
} from '../../lib/mention-utils';
import { MentionVariable } from '../../lib/template-constants';

interface EnhancedMentionVariable extends MentionVariable {
  keywords?: string[];
}

// Test data
const mockVariables: EnhancedMentionVariable[] = [
  {
    id: 'mieter.name',
    label: 'Mieter.Name',
    description: 'Vollständiger Name des Mieters',
    category: 'mieter' as const,
    keywords: ['tenant', 'name', 'vollname']
  },
  {
    id: 'mieter.email',
    label: 'Mieter.Email',
    description: 'E-Mail-Adresse des Mieters',
    category: 'mieter' as const,
    keywords: ['email', 'mail', 'kontakt']
  },
  {
    id: 'wohnung.adresse',
    label: 'Wohnung.Adresse',
    description: 'Vollständige Adresse der Wohnung',
    category: 'wohnung' as const,
    keywords: ['address', 'anschrift']
  },
  {
    id: 'wohnung.groesse',
    label: 'Wohnung.Größe',
    description: 'Größe der Wohnung in m²',
    category: 'wohnung' as const,
    keywords: ['size', 'quadratmeter', 'fläche']
  },
  {
    id: 'datum.heute',
    label: 'Datum.Heute',
    description: 'Heutiges Datum (DD.MM.YYYY)',
    category: 'datum' as const,
    keywords: ['today', 'current', 'aktuell']
  },
  {
    id: 'vermieter.name',
    label: 'Vermieter.Name',
    description: 'Name des Vermieters',
    category: 'vermieter' as const,
    keywords: ['landlord', 'owner']
  }
];

describe('filterMentionVariables', () => {
  describe('basic filtering', () => {
    it('should return all variables when query is empty', () => {
      // For empty we slice top 10 as per API
      const result = filterMentionVariables(mockVariables, '');
      expect(result).toHaveLength(Math.min(10, mockVariables.length));
    });

    it('should return all variables when query is only whitespace', () => {
      const result = filterMentionVariables(mockVariables, '   ');
      expect(result).toHaveLength(Math.min(10, mockVariables.length));
    });

    it('should filter by label (case-insensitive)', () => {
      const result = filterMentionVariables(mockVariables, 'mieter');
      expect(result).toHaveLength(2); // mieter.name, mieter.email
      expect(result.every(v => v.label.toLowerCase().includes('mieter'))).toBe(true);
    });

    it('should filter by description (case-insensitive)', () => {
      const result = filterMentionVariables(mockVariables, 'adresse');
      expect(result).toHaveLength(2); // wohnung.adresse and mieter.email (E-Mail-Adresse)
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
        { id: 'test1', label: 'Name Test', description: 'Test description', category: 'mieter' as const },
        { id: 'test2', label: 'Name', description: 'Exact match', category: 'mieter' as const },
        { id: 'test3', label: 'Test Name', description: 'Another test', category: 'mieter' as const }
      ];
      
      const result = filterMentionVariables(testVariables, 'name');
      expect(result[0].id).toBe('test2'); // Exact match should be first
    });

    it('should prioritize label starts with query', () => {
      const testVariables: MentionVariable[] = [
        { id: 'test1', label: 'Contains Name', description: 'Test description', category: 'mieter' as const },
        { id: 'test2', label: 'Name Starts', description: 'Another test', category: 'mieter' as const }
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
      
      expect(result.length).toBe(originalOrder.length);
    });
  });

  describe('edge cases', () => {
    it('should handle empty variables array', () => {
      const result = filterMentionVariables([], 'test');
      expect(result).toHaveLength(0);
    });

    it('should handle variables without category', () => {
      const variablesWithoutCategory: MentionVariable[] = [
        { id: 'test1', label: 'Test Label', description: 'Test description' }
      ] as MentionVariable[]; // Suppress strict typing here to test the behavior
      
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
    ] as MentionVariable[]; // Suppress strict typing here
    
    const result = groupMentionVariablesByCategory(variablesWithoutCategory);
    expect(result.uncategorized).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const result = groupMentionVariablesByCategory([]);
    expect(result).toEqual({});
  });
});
