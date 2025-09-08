/**
 * Placeholder Validation Utilities
 * Additional validation logic for template placeholders
 */

import { PlaceholderEngine, ValidationError, ContextType } from './placeholder-engine';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  placeholders: string[];
}

export interface TemplateValidationOptions {
  requireContextValidation?: boolean;
  availableContext?: ContextType[];
  strictMode?: boolean;
}

/**
 * Template Validator Class
 * Provides comprehensive validation for template content
 */
export class TemplateValidator {
  private engine: PlaceholderEngine;
  
  constructor(engine: PlaceholderEngine) {
    this.engine = engine;
  }
  
  /**
   * Validate complete template content
   */
  validateTemplate(
    content: string, 
    options: TemplateValidationOptions = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Parse placeholders from content
    const placeholders = this.engine.parsePlaceholders(content);
    
    // Validate placeholder syntax and existence
    const syntaxErrors = this.engine.validatePlaceholders(content);
    errors.push(...syntaxErrors);
    
    // Validate context requirements if requested
    if (options.requireContextValidation && options.availableContext) {
      const contextErrors = this.engine.validateContextRequirements(
        placeholders,
        options.availableContext
      );
      errors.push(...contextErrors);
    }
    
    // Additional validations in strict mode
    if (options.strictMode) {
      const strictWarnings = this.performStrictValidation(content, placeholders);
      warnings.push(...strictWarnings);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      placeholders
    };
  }
  
  /**
   * Perform strict validation checks
   */
  private performStrictValidation(
    content: string, 
    placeholders: string[]
  ): ValidationError[] {
    const warnings: ValidationError[] = [];
    
    // Check for potential typos in placeholder names
    const typoWarnings = this.detectPotentialTypos(placeholders);
    warnings.push(...typoWarnings);
    
    // Check for unused @ symbols
    const unusedAtSymbols = this.detectUnusedAtSymbols(content);
    warnings.push(...unusedAtSymbols);
    
    return warnings;
  }
  
  /**
   * Detect potential typos in placeholder names
   */
  private detectPotentialTypos(placeholders: string[]): ValidationError[] {
    const warnings: ValidationError[] = [];
    const allDefinitions = Array.from(this.engine['placeholderMap'].values());
    
    for (const placeholder of placeholders) {
      if (this.engine.getPlaceholderDefinition(placeholder)) continue;
      
      // Find similar placeholders
      const similar = allDefinitions.filter(def => {
        const similarity = this.calculateSimilarity(placeholder, def.key);
        return similarity > 0.7 && similarity < 1.0;
      });
      
      if (similar.length > 0) {
        const suggestions = similar.map(def => def.key).join(', ');
        warnings.push({
          type: 'unknown_placeholder',
          message: `Möglicher Tippfehler in "${placeholder}". Meinten Sie: ${suggestions}?`,
          position: 0,
          length: 0,
          placeholder
        });
      }
    }
    
    return warnings;
  }
  
  /**
   * Detect unused @ symbols that might be intended as placeholders
   */
  private detectUnusedAtSymbols(content: string): ValidationError[] {
    const warnings: ValidationError[] = [];
    const atSymbolRegex = /@(?![a-zA-Z])/g;
    let match;
    
    while ((match = atSymbolRegex.exec(content)) !== null) {
      warnings.push({
        type: 'invalid_syntax',
        message: 'Einzelnes @ Symbol gefunden. Sollte dies ein Platzhalter sein?',
        position: match.index,
        length: 1
      });
    }
    
    return warnings;
  }
  
  /**
   * Calculate string similarity for typo detection
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Get suggestions for improving template
   */
  getSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const placeholders = this.engine.parsePlaceholders(content);
    
    // Suggest adding context requirements
    const contextTypes = new Set<ContextType>();
    for (const placeholder of placeholders) {
      const definition = this.engine.getPlaceholderDefinition(placeholder);
      if (definition?.requiresContext) {
        definition.requiresContext.forEach(ctx => contextTypes.add(ctx));
      }
    }
    
    if (contextTypes.size > 0) {
      suggestions.push(
        `Template benötigt folgende Kontexte: ${Array.from(contextTypes).join(', ')}`
      );
    }
    
    // Suggest common placeholders if none are used
    if (placeholders.length === 0) {
      suggestions.push(
        'Tipp: Verwenden Sie @ um Platzhalter hinzuzufügen (z.B. @mieter.name, @datum)'
      );
    }
    
    return suggestions;
  }
}

/**
 * Real-time validation for editor
 */
export class RealTimeValidator {
  private validator: TemplateValidator;
  private debounceTimeout: NodeJS.Timeout | null = null;
  
  constructor(engine: PlaceholderEngine) {
    this.validator = new TemplateValidator(engine);
  }
  
  /**
   * Validate with debouncing for real-time editing
   */
  validateWithDebounce(
    content: string,
    options: TemplateValidationOptions,
    callback: (result: ValidationResult) => void,
    delay: number = 300
  ): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      const result = this.validator.validateTemplate(content, options);
      callback(result);
    }, delay);
  }
  
  /**
   * Cancel pending validation
   */
  cancel(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
}

// Export utilities
export { PlaceholderEngine } from './placeholder-engine';
export const createValidator = (engine: PlaceholderEngine) => new TemplateValidator(engine);
export const createRealTimeValidator = (engine: PlaceholderEngine) => new RealTimeValidator(engine);