/**
 * Placeholder Engine for Template System
 * Handles parsing, validation, and autocomplete for template placeholders
 */

export interface PlaceholderDefinition {
  key: string;
  label: string;
  description: string;
  category: 'datum' | 'mieter' | 'wohnung' | 'haus' | 'vermieter';
  requiresContext?: ContextType[];
}

export type ContextType = 'mieter' | 'wohnung' | 'haus' | 'mail' | 'vertrag' | 'kuendigung';

export interface AutocompleteSuggestion {
  placeholder: PlaceholderDefinition;
  insertText: string;
  displayText: string;
  score: number;
}

export interface ValidationError {
  type: 'invalid_syntax' | 'unknown_placeholder' | 'missing_context';
  message: string;
  position: number;
  length: number;
  placeholder?: string;
}

// Comprehensive placeholder definitions registry
export const PLACEHOLDER_DEFINITIONS: PlaceholderDefinition[] = [
  // Date placeholders
  {
    key: '@datum',
    label: 'Aktuelles Datum',
    description: 'DD.MM.YYYY Format',
    category: 'datum'
  },
  {
    key: '@datum.lang',
    label: 'Datum (lang)',
    description: 'DD. MMMM YYYY Format',
    category: 'datum'
  },
  {
    key: '@monat',
    label: 'Aktueller Monat',
    description: 'Monatsname',
    category: 'datum'
  },
  {
    key: '@jahr',
    label: 'Aktuelles Jahr',
    description: 'YYYY Format',
    category: 'datum'
  },
  
  // Tenant placeholders
  {
    key: '@mieter.name',
    label: 'Mieter Name',
    description: 'Vollständiger Name des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.vorname',
    label: 'Mieter Vorname',
    description: 'Vorname des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.nachname',
    label: 'Mieter Nachname',
    description: 'Nachname des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.email',
    label: 'Mieter E-Mail',
    description: 'E-Mail-Adresse des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.telefon',
    label: 'Mieter Telefon',
    description: 'Telefonnummer des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.einzugsdatum',
    label: 'Mieter Einzugsdatum',
    description: 'Einzugsdatum des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  
  // Apartment placeholders
  {
    key: '@wohnung.adresse',
    label: 'Wohnung Adresse',
    description: 'Vollständige Adresse der Wohnung',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
  {
    key: '@wohnung.nummer',
    label: 'Wohnung Nummer',
    description: 'Wohnungsnummer',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
  {
    key: '@wohnung.groesse',
    label: 'Wohnung Größe',
    description: 'Wohnfläche in m²',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
  {
    key: '@wohnung.miete',
    label: 'Wohnung Miete',
    description: 'Monatliche Miete',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
  {
    key: '@wohnung.zimmer',
    label: 'Wohnung Zimmer',
    description: 'Anzahl der Zimmer',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
  
  // House placeholders
  {
    key: '@haus.name',
    label: 'Haus Name',
    description: 'Name/Bezeichnung des Hauses',
    category: 'haus',
    requiresContext: ['haus']
  },
  {
    key: '@haus.ort',
    label: 'Haus Ort',
    description: 'Ort des Hauses',
    category: 'haus',
    requiresContext: ['haus']
  },
  {
    key: '@haus.strasse',
    label: 'Haus Straße',
    description: 'Straße des Hauses',
    category: 'haus',
    requiresContext: ['haus']
  },
  {
    key: '@haus.groesse',
    label: 'Haus Größe',
    description: 'Gesamtfläche des Hauses',
    category: 'haus',
    requiresContext: ['haus']
  },
  
  // Landlord placeholders
  {
    key: '@vermieter.name',
    label: 'Vermieter Name',
    description: 'Name des Vermieters',
    category: 'vermieter'
  },
  {
    key: '@vermieter.email',
    label: 'Vermieter E-Mail',
    description: 'E-Mail-Adresse des Vermieters',
    category: 'vermieter'
  },
  {
    key: '@vermieter.telefon',
    label: 'Vermieter Telefon',
    description: 'Telefonnummer des Vermieters',
    category: 'vermieter'
  }
];

/**
 * Placeholder Engine Class
 * Main class for handling placeholder operations
 */
export class PlaceholderEngine {
  private placeholderMap: Map<string, PlaceholderDefinition>;
  
  constructor(definitions: PlaceholderDefinition[] = PLACEHOLDER_DEFINITIONS) {
    this.placeholderMap = new Map(definitions.map(def => [def.key, def]));
  }
  
  /**
   * Parse placeholders from template content
   */
  parsePlaceholders(content: string): string[] {
    const placeholderRegex = /@[a-zA-Z][a-zA-Z0-9._]*\b/g;
    const matches = content.match(placeholderRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }
  
  /**
   * Validate placeholder syntax and existence
   */
  validatePlaceholders(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const placeholderRegex = /@[a-zA-Z][a-zA-Z0-9._]*\b/g;
    let match;
    
    while ((match = placeholderRegex.exec(content)) !== null) {
      const placeholder = match[0];
      const position = match.index;
      
      // Check if placeholder exists in definitions
      if (!this.placeholderMap.has(placeholder)) {
        errors.push({
          type: 'unknown_placeholder',
          message: `Unbekannter Platzhalter: ${placeholder}`,
          position,
          length: placeholder.length,
          placeholder
        });
      }
    }
    
    // Check for invalid syntax (@ followed by non-letter, but not in email addresses)
    const invalidSyntaxRegex = /@(?![a-zA-Z])/g;
    while ((match = invalidSyntaxRegex.exec(content)) !== null) {
      // Skip if this looks like an email address
      const beforeAt = content.substring(Math.max(0, match.index - 10), match.index);
      const afterAt = content.substring(match.index + 1, match.index + 20);
      
      // Simple email detection - if there's a word character before @ and domain-like after
      if (!/\w$/.test(beforeAt) || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(afterAt)) {
        errors.push({
          type: 'invalid_syntax',
          message: 'Ungültige Platzhalter-Syntax. Platzhalter müssen mit einem Buchstaben beginnen.',
          position: match.index,
          length: 2
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Generate autocomplete suggestions with fuzzy search
   */
  generateSuggestions(query: string, maxResults: number = 10): AutocompleteSuggestion[] {
    if (!query.startsWith('@')) {
      return [];
    }
    
    const searchTerm = query.toLowerCase();
    const suggestions: AutocompleteSuggestion[] = [];
    
    for (const definition of this.placeholderMap.values()) {
      const score = this.calculateFuzzyScore(searchTerm, definition);
      
      if (score > 0) {
        suggestions.push({
          placeholder: definition,
          insertText: definition.key,
          displayText: `${definition.key} - ${definition.label}`,
          score
        });
      }
    }
    
    // Sort by score (descending) and limit results
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }
  
  /**
   * Calculate fuzzy search score for autocomplete
   */
  private calculateFuzzyScore(query: string, definition: PlaceholderDefinition): number {
    const key = definition.key.toLowerCase();
    const label = definition.label.toLowerCase();
    
    // Exact match gets highest score
    if (key === query) return 100;
    
    // Starts with query gets high score
    if (key.startsWith(query)) return 90;
    
    // Contains query gets medium score
    if (key.includes(query)) return 70;
    
    // Label contains query gets lower score
    if (label.includes(query.substring(1))) return 50; // Remove @ from query
    
    // Fuzzy match based on character sequence
    const fuzzyScore = this.fuzzyMatch(query, key);
    return fuzzyScore > 0.5 ? fuzzyScore * 40 : 0;
  }
  
  /**
   * Simple fuzzy matching algorithm
   */
  private fuzzyMatch(pattern: string, text: string): number {
    let patternIndex = 0;
    let textIndex = 0;
    let matches = 0;
    
    while (patternIndex < pattern.length && textIndex < text.length) {
      if (pattern[patternIndex] === text[textIndex]) {
        matches++;
        patternIndex++;
      }
      textIndex++;
    }
    
    return matches / pattern.length;
  }
  
  /**
   * Get placeholder definition by key
   */
  getPlaceholderDefinition(key: string): PlaceholderDefinition | undefined {
    return this.placeholderMap.get(key);
  }
  
  /**
   * Get all placeholders by category
   */
  getPlaceholdersByCategory(category: PlaceholderDefinition['category']): PlaceholderDefinition[] {
    return Array.from(this.placeholderMap.values())
      .filter(def => def.category === category);
  }
  
  /**
   * Validate context requirements for placeholders
   */
  validateContextRequirements(
    placeholders: string[], 
    availableContext: ContextType[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const placeholder of placeholders) {
      const definition = this.placeholderMap.get(placeholder);
      if (!definition || !definition.requiresContext) continue;
      
      const missingContext = definition.requiresContext.filter(
        ctx => !availableContext.includes(ctx)
      );
      
      if (missingContext.length > 0) {
        errors.push({
          type: 'missing_context',
          message: `Platzhalter ${placeholder} benötigt Kontext: ${missingContext.join(', ')}`,
          position: 0,
          length: 0,
          placeholder
        });
      }
    }
    
    return errors;
  }
}

// Export singleton instance
export const placeholderEngine = new PlaceholderEngine();