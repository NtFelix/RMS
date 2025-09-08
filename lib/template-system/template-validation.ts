/**
 * Comprehensive Template Validation System
 * Provides validation for template creation, usage, and processing
 */

import { z } from 'zod';
import type { 
  Template, 
  TemplateContext, 
  ContextType,
  PlaceholderDefinition,
  TemplateValidationResult,
  TemplateError
} from '@/types/template-system';
import { PLACEHOLDER_DEFINITIONS } from './placeholder-definitions';
import { CONTEXT_MAPPINGS } from '@/types/template-system';

/**
 * Template creation validation schema
 */
export const templateCreateSchema = z.object({
  titel: z.string()
    .min(1, "Template-Name ist erforderlich")
    .max(100, "Template-Name darf maximal 100 Zeichen lang sein")
    .regex(/^[^<>:"/\\|?*]+$/, "Template-Name enthält ungültige Zeichen")
    .refine(
      (name) => !name.toLowerCase().includes('script'),
      "Template-Name darf keine Skript-Referenzen enthalten"
    ),
  
  inhalt: z.string()
    .min(1, "Template-Inhalt ist erforderlich")
    .max(50000, "Template-Inhalt ist zu lang (maximal 50.000 Zeichen)")
    .refine(
      (content) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content),
      "Template-Inhalt darf keine Skript-Tags enthalten"
    ),
  
  kategorie: z.string()
    .min(1, "Kategorie ist erforderlich")
    .refine(
      (kategorie) => Object.keys(CONTEXT_MAPPINGS).includes(kategorie),
      "Ungültige Kategorie ausgewählt"
    ),
  
  kontext_anforderungen: z.array(z.string())
    .default([])
    .refine(
      (contexts) => contexts.every(ctx => 
        ['mieter', 'wohnung', 'haus', 'mail', 'vertrag', 'kuendigung'].includes(ctx)
      ),
      "Ungültige Kontext-Anforderungen"
    )
});

/**
 * Template usage validation schema
 */
export const templateUsageSchema = z.object({
  template_id: z.string().uuid("Ungültige Template-ID"),
  mieter_id: z.string().uuid().optional(),
  wohnung_id: z.string().uuid().optional(),
  haus_id: z.string().uuid().optional(),
}).refine(
  (data) => {
    // At least one context must be provided if template requires it
    return data.mieter_id || data.wohnung_id || data.haus_id;
  },
  {
    message: "Mindestens ein Kontext muss ausgewählt werden",
    path: ["context"]
  }
);

/**
 * Placeholder syntax validation
 */
export class PlaceholderValidator {
  private placeholderMap: Map<string, PlaceholderDefinition>;
  
  constructor() {
    this.placeholderMap = new Map(
      PLACEHOLDER_DEFINITIONS.map(def => [def.key, def])
    );
  }
  
  /**
   * Validate placeholder syntax in template content
   */
  validatePlaceholderSyntax(content: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const placeholders = this.extractPlaceholders(content);
    
    // Check for malformed placeholders
    const malformedPlaceholders = this.findMalformedPlaceholders(content);
    malformedPlaceholders.forEach(placeholder => {
      errors.push(`Ungültiger Platzhalter: "${placeholder}". Platzhalter müssen mit @ beginnen und gültige Zeichen enthalten.`);
    });
    
    // Check for unknown placeholders
    const unknownPlaceholders = placeholders.filter(p => !this.placeholderMap.has(p));
    unknownPlaceholders.forEach(placeholder => {
      const suggestions = this.findSimilarPlaceholders(placeholder);
      if (suggestions.length > 0) {
        warnings.push(`Unbekannter Platzhalter: "${placeholder}". Meinten Sie: ${suggestions.join(', ')}?`);
      } else {
        errors.push(`Unbekannter Platzhalter: "${placeholder}"`);
      }
    });
    
    // Check for incomplete placeholders (just @ symbols)
    const incompletePlaceholders = this.findIncompletePlaceholders(content);
    incompletePlaceholders.forEach(match => {
      warnings.push(`Unvollständiger Platzhalter bei Position ${match.index}. Verwenden Sie @platzhalter.name`);
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      placeholders
    };
  }
  
  /**
   * Validate context requirements for placeholders
   */
  validateContextRequirements(
    placeholders: string[], 
    availableContext: ContextType[]
  ): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingContexts = new Set<ContextType>();
    
    placeholders.forEach(placeholder => {
      const definition = this.placeholderMap.get(placeholder);
      if (definition?.requiresContext) {
        definition.requiresContext.forEach(requiredContext => {
          if (!availableContext.includes(requiredContext)) {
            missingContexts.add(requiredContext);
          }
        });
      }
    });
    
    if (missingContexts.size > 0) {
      const contextNames = Array.from(missingContexts).join(', ');
      errors.push(`Fehlende Kontext-Anforderungen: ${contextNames}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      placeholders
    };
  }
  
  /**
   * Extract all placeholders from content
   */
  private extractPlaceholders(content: string): string[] {
    if (!content || typeof content !== 'string') {
      return [];
    }
    const placeholderRegex = /@[a-zA-Z][a-zA-Z0-9._]*\b/g;
    const matches = content.match(placeholderRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }
  
  /**
   * Find malformed placeholder patterns
   */
  private findMalformedPlaceholders(content: string): string[] {
    if (!content || typeof content !== 'string') {
      return [];
    }
    const malformedRegex = /@[^a-zA-Z\s][^\s]*/g;
    const matches = content.match(malformedRegex) || [];
    return [...new Set(matches)];
  }
  
  /**
   * Find incomplete placeholders (just @ symbols)
   */
  private findIncompletePlaceholders(content: string): RegExpMatchArray[] {
    if (!content || typeof content !== 'string') {
      return [];
    }
    const incompleteRegex = /@(?![a-zA-Z])/g;
    const matches: RegExpMatchArray[] = [];
    let match;
    
    while ((match = incompleteRegex.exec(content)) !== null) {
      matches.push(match);
    }
    
    return matches;
  }
  
  /**
   * Find similar placeholders for suggestions
   */
  private findSimilarPlaceholders(placeholder: string): string[] {
    const allPlaceholders = Array.from(this.placeholderMap.keys());
    const similar = allPlaceholders.filter(p => {
      const similarity = this.calculateSimilarity(placeholder.toLowerCase(), p.toLowerCase());
      return similarity > 0.6 && similarity < 1.0;
    });
    
    return similar.slice(0, 3); // Return top 3 suggestions
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance
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
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * Template content security validator
 */
export class TemplateSecurityValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi // Event handlers like onclick, onload, etc.
  ];
  
  /**
   * Validate template content for security issues
   */
  static validateSecurity(content: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for dangerous patterns
    this.DANGEROUS_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        errors.push("Template enthält potentiell gefährlichen Code und kann nicht gespeichert werden.");
      }
    });
    
    // Check for suspicious URLs
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    const urls = content.match(urlRegex) || [];
    const suspiciousUrls = urls.filter(url => 
      url.includes('javascript:') || 
      url.includes('data:') ||
      url.includes('<script')
    );
    
    if (suspiciousUrls.length > 0) {
      errors.push("Template enthält verdächtige URLs.");
    }
    
    // Check for excessive HTML complexity
    const htmlTagCount = (content.match(/<[^>]+>/g) || []).length;
    if (htmlTagCount > 100) {
      warnings.push("Template enthält sehr viele HTML-Tags. Dies könnte die Performance beeinträchtigen.");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      placeholders: []
    };
  }
}

/**
 * Template business logic validator
 */
export class TemplateBusinessValidator {
  /**
   * Validate template against business rules
   */
  static validateBusinessRules(template: Partial<Template>): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check category-context consistency
    if (template.kategorie && template.kontext_anforderungen) {
      const expectedContexts = CONTEXT_MAPPINGS[template.kategorie as keyof typeof CONTEXT_MAPPINGS];
      if (expectedContexts) {
        const missingContexts = expectedContexts.filter(
          ctx => !template.kontext_anforderungen!.includes(ctx)
        );
        
        if (missingContexts.length > 0) {
          warnings.push(
            `Für die Kategorie "${template.kategorie}" werden normalerweise folgende Kontexte benötigt: ${missingContexts.join(', ')}`
          );
        }
      }
    }
    
    // Check for reasonable content length
    if (template.inhalt) {
      if (template.inhalt.length < 10) {
        warnings.push("Template-Inhalt ist sehr kurz. Stellen Sie sicher, dass alle notwendigen Informationen enthalten sind.");
      }
      
      if (template.inhalt.length > 10000) {
        warnings.push("Template-Inhalt ist sehr lang. Dies könnte die Performance beeinträchtigen.");
      }
    }
    
    // Check for placeholder usage
    if (template.inhalt && !template.inhalt.includes('@')) {
      warnings.push("Template enthält keine Platzhalter. Möchten Sie dynamische Inhalte hinzufügen?");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      placeholders: []
    };
  }
}

/**
 * Comprehensive template validator that combines all validation types
 */
export class TemplateValidator {
  private placeholderValidator: PlaceholderValidator;
  
  constructor() {
    this.placeholderValidator = new PlaceholderValidator();
  }
  
  /**
   * Validate template for creation
   */
  async validateForCreation(templateData: any): Promise<TemplateValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allPlaceholders: string[] = [];
    
    try {
      // Schema validation
      const schemaResult = templateCreateSchema.safeParse(templateData);
      if (!schemaResult.success) {
        schemaResult.error.errors.forEach(error => {
          allErrors.push(`${error.path.join('.')}: ${error.message}`);
        });
      }
      
      // Security validation
      if (templateData.inhalt) {
        const securityResult = TemplateSecurityValidator.validateSecurity(templateData.inhalt);
        allErrors.push(...securityResult.errors);
        allWarnings.push(...securityResult.warnings);
      }
      
      // Placeholder validation
      if (templateData.inhalt) {
        const placeholderResult = this.placeholderValidator.validatePlaceholderSyntax(templateData.inhalt);
        allErrors.push(...placeholderResult.errors);
        allWarnings.push(...placeholderResult.warnings);
        allPlaceholders.push(...placeholderResult.placeholders);
      }
      
      // Business rules validation
      const businessResult = TemplateBusinessValidator.validateBusinessRules(templateData);
      allErrors.push(...businessResult.errors);
      allWarnings.push(...businessResult.warnings);
      
      // Context requirements validation
      if (templateData.kontext_anforderungen && allPlaceholders.length > 0) {
        const contextResult = this.placeholderValidator.validateContextRequirements(
          allPlaceholders,
          templateData.kontext_anforderungen
        );
        allErrors.push(...contextResult.errors);
        allWarnings.push(...contextResult.warnings);
      }
      
    } catch (error) {
      allErrors.push(`Validierungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      placeholders: allPlaceholders
    };
  }
  
  /**
   * Validate template for usage
   */
  async validateForUsage(
    template: Template, 
    context: TemplateContext
  ): Promise<TemplateValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allPlaceholders: string[] = [];
    
    try {
      // Extract placeholders from template
      const placeholderResult = this.placeholderValidator.validatePlaceholderSyntax(template.inhalt);
      allErrors.push(...placeholderResult.errors);
      allWarnings.push(...placeholderResult.warnings);
      allPlaceholders.push(...placeholderResult.placeholders);
      
      // Validate context availability
      const availableContexts: ContextType[] = [];
      if (context.mieter) availableContexts.push('mieter');
      if (context.wohnung) availableContexts.push('wohnung');
      if (context.haus) availableContexts.push('haus');
      
      // Check required contexts
      const missingContexts = template.kontext_anforderungen.filter(
        required => !availableContexts.includes(required)
      );
      
      if (missingContexts.length > 0) {
        allErrors.push(`Fehlende erforderliche Kontexte: ${missingContexts.join(', ')}`);
      }
      
      // Validate placeholder context requirements
      const contextResult = this.placeholderValidator.validateContextRequirements(
        allPlaceholders,
        availableContexts
      );
      allErrors.push(...contextResult.errors);
      allWarnings.push(...contextResult.warnings);
      
    } catch (error) {
      allErrors.push(`Validierungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      placeholders: allPlaceholders
    };
  }
}

// Export singleton instance
export const templateValidator = new TemplateValidator();
export const placeholderValidator = new PlaceholderValidator();