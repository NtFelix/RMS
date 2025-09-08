/**
 * Unit Tests for Placeholder Engine
 */

import {
  PlaceholderEngine,
  PLACEHOLDER_DEFINITIONS,
  PlaceholderDefinition,
  AutocompleteSuggestion,
  ValidationError,
  ContextType
} from '@/lib/template-system/placeholder-engine';

describe('PlaceholderEngine', () => {
  let engine: PlaceholderEngine;

  beforeEach(() => {
    engine = new PlaceholderEngine();
  });

  describe('parsePlaceholders', () => {
    it('should parse valid placeholders from content', () => {
      const content = 'Hallo @mieter.name, Ihre Miete für @wohnung.adresse beträgt @wohnung.miete.';
      const placeholders = engine.parsePlaceholders(content);
      
      expect(placeholders).toEqual([
        '@mieter.name',
        '@wohnung.adresse',
        '@wohnung.miete'
      ]);
    });

    it('should handle content without placeholders', () => {
      const content = 'Dies ist ein normaler Text ohne Platzhalter.';
      const placeholders = engine.parsePlaceholders(content);
      
      expect(placeholders).toEqual([]);
    });

    it('should remove duplicate placeholders', () => {
      const content = '@mieter.name @mieter.name @datum @mieter.name';
      const placeholders = engine.parsePlaceholders(content);
      
      expect(placeholders).toEqual(['@mieter.name', '@datum']);
    });

    it('should handle complex placeholder patterns', () => {
      const content = '@mieter.name_test @wohnung.nummer123 @datum.lang';
      const placeholders = engine.parsePlaceholders(content);
      
      expect(placeholders).toEqual([
        '@mieter.name_test',
        '@wohnung.nummer123',
        '@datum.lang'
      ]);
    });
  });

  describe('validatePlaceholders', () => {
    it('should validate known placeholders without errors', () => {
      const content = 'Hallo @mieter.name, heute ist @datum.';
      const errors = engine.validatePlaceholders(content);
      
      expect(errors).toEqual([]);
    });

    it('should detect unknown placeholders', () => {
      const content = 'Hallo @mieter.unknown, heute ist @invalid.placeholder.';
      const errors = engine.validatePlaceholders(content);
      
      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatchObject({
        type: 'unknown_placeholder',
        placeholder: '@mieter.unknown',
        message: expect.stringContaining('Unbekannter Platzhalter')
      });
      expect(errors[1]).toMatchObject({
        type: 'unknown_placeholder',
        placeholder: '@invalid.placeholder'
      });
    });

    it('should detect invalid syntax', () => {
      const content = 'Invalid: @123invalid and standalone @';
      const errors = engine.validatePlaceholders(content);
      
      expect(errors).toHaveLength(2);
      expect(errors.some(e => e.type === 'invalid_syntax')).toBe(true);
    });

    it('should provide correct position information', () => {
      const content = 'Start @unknown Ende';
      const errors = engine.validatePlaceholders(content);
      
      expect(errors[0].position).toBe(6);
      expect(errors[0].length).toBe(8);
    });
  });

  describe('generateSuggestions', () => {
    it('should return empty array for non-@ queries', () => {
      const suggestions = engine.generateSuggestions('mieter');
      expect(suggestions).toEqual([]);
    });

    it('should return exact matches with highest score', () => {
      const suggestions = engine.generateSuggestions('@datum');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].placeholder.key).toBe('@datum');
      expect(suggestions[0].score).toBe(100);
    });

    it('should return prefix matches with high scores', () => {
      const suggestions = engine.generateSuggestions('@mieter');
      
      const mieterSuggestions = suggestions.filter(s => 
        s.placeholder.key.startsWith('@mieter')
      );
      expect(mieterSuggestions.length).toBeGreaterThan(0);
      expect(mieterSuggestions[0].score).toBe(90);
    });

    it('should limit results to maxResults parameter', () => {
      const suggestions = engine.generateSuggestions('@', 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should sort suggestions by score descending', () => {
      const suggestions = engine.generateSuggestions('@m');
      
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].score).toBeLessThanOrEqual(suggestions[i - 1].score);
      }
    });

    it('should include proper display text and insert text', () => {
      const suggestions = engine.generateSuggestions('@datum');
      const datumSuggestion = suggestions.find(s => s.placeholder.key === '@datum');
      
      expect(datumSuggestion).toBeDefined();
      expect(datumSuggestion!.insertText).toBe('@datum');
      expect(datumSuggestion!.displayText).toContain('@datum');
      expect(datumSuggestion!.displayText).toContain('Aktuelles Datum');
    });
  });

  describe('getPlaceholderDefinition', () => {
    it('should return definition for valid placeholder', () => {
      const definition = engine.getPlaceholderDefinition('@mieter.name');
      
      expect(definition).toBeDefined();
      expect(definition!.key).toBe('@mieter.name');
      expect(definition!.category).toBe('mieter');
    });

    it('should return undefined for invalid placeholder', () => {
      const definition = engine.getPlaceholderDefinition('@invalid.placeholder');
      expect(definition).toBeUndefined();
    });
  });

  describe('getPlaceholdersByCategory', () => {
    it('should return all placeholders for a category', () => {
      const mieterPlaceholders = engine.getPlaceholdersByCategory('mieter');
      
      expect(mieterPlaceholders.length).toBeGreaterThan(0);
      mieterPlaceholders.forEach(placeholder => {
        expect(placeholder.category).toBe('mieter');
      });
    });

    it('should return empty array for non-existent category', () => {
      const placeholders = engine.getPlaceholdersByCategory('invalid' as any);
      expect(placeholders).toEqual([]);
    });
  });

  describe('validateContextRequirements', () => {
    it('should validate placeholders with sufficient context', () => {
      const placeholders = ['@mieter.name', '@datum'];
      const availableContext: ContextType[] = ['mieter'];
      const errors = engine.validateContextRequirements(placeholders, availableContext);
      
      expect(errors).toEqual([]);
    });

    it('should detect missing context requirements', () => {
      const placeholders = ['@mieter.name', '@wohnung.adresse'];
      const availableContext: ContextType[] = ['mieter'];
      const errors = engine.validateContextRequirements(placeholders, availableContext);
      
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: 'missing_context',
        placeholder: '@wohnung.adresse',
        message: expect.stringContaining('benötigt Kontext')
      });
    });

    it('should handle placeholders without context requirements', () => {
      const placeholders = ['@datum', '@vermieter.name'];
      const availableContext: ContextType[] = [];
      const errors = engine.validateContextRequirements(placeholders, availableContext);
      
      expect(errors).toEqual([]);
    });
  });

  describe('fuzzy matching', () => {
    it('should match partial placeholder names', () => {
      const suggestions = engine.generateSuggestions('@miet');
      const mieterSuggestions = suggestions.filter(s => 
        s.placeholder.key.includes('mieter')
      );
      
      expect(mieterSuggestions.length).toBeGreaterThan(0);
    });

    it('should match based on label content', () => {
      const suggestions = engine.generateSuggestions('@name');
      const nameSuggestions = suggestions.filter(s => 
        s.placeholder.label.toLowerCase().includes('name')
      );
      
      expect(nameSuggestions.length).toBeGreaterThan(0);
    });
  });
});

describe('PLACEHOLDER_DEFINITIONS', () => {
  it('should contain all required categories', () => {
    const categories = new Set(PLACEHOLDER_DEFINITIONS.map(def => def.category));
    
    expect(categories).toContain('datum');
    expect(categories).toContain('mieter');
    expect(categories).toContain('wohnung');
    expect(categories).toContain('haus');
    expect(categories).toContain('vermieter');
  });

  it('should have unique placeholder keys', () => {
    const keys = PLACEHOLDER_DEFINITIONS.map(def => def.key);
    const uniqueKeys = new Set(keys);
    
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('should have proper structure for all definitions', () => {
    PLACEHOLDER_DEFINITIONS.forEach(definition => {
      expect(definition).toHaveProperty('key');
      expect(definition).toHaveProperty('label');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('category');
      
      expect(definition.key).toMatch(/^@[a-zA-Z][a-zA-Z0-9._]*$/);
      expect(definition.label).toBeTruthy();
      expect(definition.description).toBeTruthy();
    });
  });

  it('should have context requirements for appropriate placeholders', () => {
    const mieterPlaceholders = PLACEHOLDER_DEFINITIONS.filter(def => 
      def.category === 'mieter' && def.key !== '@mieter'
    );
    
    mieterPlaceholders.forEach(placeholder => {
      expect(placeholder.requiresContext).toContain('mieter');
    });
  });
});

describe('PlaceholderEngine with custom definitions', () => {
  it('should work with custom placeholder definitions', () => {
    const customDefinitions: PlaceholderDefinition[] = [
      {
        key: '@custom.test',
        label: 'Custom Test',
        description: 'A custom test placeholder',
        category: 'datum'
      }
    ];
    
    const customEngine = new PlaceholderEngine(customDefinitions);
    const definition = customEngine.getPlaceholderDefinition('@custom.test');
    
    expect(definition).toBeDefined();
    expect(definition!.label).toBe('Custom Test');
  });

  it('should generate suggestions for custom definitions', () => {
    const customDefinitions: PlaceholderDefinition[] = [
      {
        key: '@custom.placeholder',
        label: 'Custom Placeholder',
        description: 'A custom placeholder',
        category: 'datum'
      }
    ];
    
    const customEngine = new PlaceholderEngine(customDefinitions);
    const suggestions = customEngine.generateSuggestions('@custom');
    
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].placeholder.key).toBe('@custom.placeholder');
  });
});