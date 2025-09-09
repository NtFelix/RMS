/**
 * Optimized Template Processor for Context Resolution
 * Handles replacing placeholders with actual data from context entities with caching
 */

import type { 
  TemplateContext, 
  TemplateProcessingResult,
  PlaceholderDefinition 
} from '@/types/template-system';
import type { Tenant } from '@/types/Tenant';
import type { Apartment } from '@/components/apartment-table';
import type { House } from '@/components/house-table';
import { PLACEHOLDER_DEFINITIONS } from './placeholder-definitions';
import { templateCacheManager } from './cache-manager';

/**
 * Optimized Template Processor Class
 * Main class for processing templates with context data with caching and performance optimizations
 */
export class TemplateProcessor {
  private placeholderMap: Map<string, PlaceholderDefinition>;
  private placeholderRegex: RegExp;
  
  constructor(definitions: PlaceholderDefinition[] = PLACEHOLDER_DEFINITIONS) {
    this.placeholderMap = new Map(definitions.map(def => [def.key, def]));
    this.placeholderRegex = /@[a-zA-Z][a-zA-Z0-9._]*\b/g;
  }
  
  /**
   * Process template content by replacing placeholders with actual data (with caching)
   */
  processTemplate(content: string, context: TemplateContext): TemplateProcessingResult {
    try {
      // Generate context hash for caching
      const contextHash = this.generateContextHash(context);
      const cacheKey = templateCacheManager.generateTemplateKey(content, contextHash);
      
      // Check cache first
      const cached = templateCacheManager.templateCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const placeholders = this.extractPlaceholders(content);
      const unresolvedPlaceholders: string[] = [];
      let processedContent = content;
      
      // Sort placeholders by length (longest first) to avoid partial replacements
      const sortedPlaceholders = placeholders.sort((a, b) => b.length - a.length);
      
      // Process each placeholder with caching
      for (const placeholder of sortedPlaceholders) {
        const resolvedValue = this.resolvePlaceholderCached(placeholder, context);
        
        if (resolvedValue !== null) {
          // Replace all occurrences of this placeholder
          const regex = new RegExp(this.escapeRegExp(placeholder), 'g');
          processedContent = processedContent.replace(regex, resolvedValue);
        } else {
          // Track unresolved placeholders
          unresolvedPlaceholders.push(placeholder);
          
          // Replace with fallback text
          const fallbackText = this.generateFallbackText(placeholder);
          const regex = new RegExp(this.escapeRegExp(placeholder), 'g');
          processedContent = processedContent.replace(regex, fallbackText);
        }
      }
      
      const result: TemplateProcessingResult = {
        processedContent,
        unresolvedPlaceholders,
        success: true
      };

      // Cache the result
      templateCacheManager.templateCache.set(cacheKey, JSON.stringify(result));
      
      return result;
    } catch (error) {
      return {
        processedContent: content,
        unresolvedPlaceholders: [],
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown processing error']
      };
    }
  }
  
  /**
   * Extract all placeholders from template content (optimized)
   */
  private extractPlaceholders(content: string): string[] {
    // Reset regex state
    this.placeholderRegex.lastIndex = 0;
    const matches = content.match(this.placeholderRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Resolve placeholder with caching
   */
  private resolvePlaceholderCached(placeholder: string, context: TemplateContext): string | null {
    // Generate cache key for this specific placeholder + context combination
    const contextKey = this.generatePlaceholderContextKey(placeholder, context);
    const cached = templateCacheManager.entityCache.get(contextKey);
    
    if (cached !== null) {
      return cached;
    }

    const resolved = this.resolvePlaceholder(placeholder, context);
    
    // Cache the resolved value (including null results)
    templateCacheManager.entityCache.set(contextKey, resolved);
    
    return resolved;
  }

  /**
   * Generate context hash for caching
   */
  private generateContextHash(context: TemplateContext): string {
    const hashParts: string[] = [];
    
    if (context.mieter) {
      hashParts.push(`m:${context.mieter.id}`);
    }
    if (context.wohnung) {
      hashParts.push(`w:${context.wohnung.id}`);
    }
    if (context.haus) {
      hashParts.push(`h:${context.haus.id}`);
    }
    if (context.vermieter) {
      hashParts.push(`v:${context.vermieter.id}`);
    }
    if (context.datum) {
      hashParts.push(`d:${context.datum.getTime()}`);
    }
    
    return hashParts.join('|');
  }

  /**
   * Generate cache key for placeholder + context combination
   */
  private generatePlaceholderContextKey(placeholder: string, context: TemplateContext): string {
    const contextHash = this.generateContextHash(context);
    return `placeholder:${placeholder}:${contextHash}`;
  }
  
  /**
   * Resolve a single placeholder with context data
   */
  private resolvePlaceholder(placeholder: string, context: TemplateContext): string | null {
    const definition = this.placeholderMap.get(placeholder);
    if (!definition) {
      return null; // Unknown placeholder
    }
    
    // Handle different placeholder categories
    switch (definition.category) {
      case 'datum':
        return this.resolveDatePlaceholder(placeholder, context.datum || new Date());
        
      case 'mieter':
        return this.resolveTenantPlaceholder(placeholder, context.mieter);
        
      case 'wohnung':
        return this.resolveApartmentPlaceholder(placeholder, context.wohnung);
        
      case 'haus':
        return this.resolveHousePlaceholder(placeholder, context.haus);
        
      case 'vermieter':
        return this.resolveLandlordPlaceholder(placeholder, context.vermieter);
        
      default:
        return null;
    }
  }
  
  /**
   * Resolve date placeholders
   */
  private resolveDatePlaceholder(placeholder: string, date: Date): string | null {
    const formatOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'Europe/Berlin'
    };
    
    switch (placeholder) {
      case '@datum':
        return date.toLocaleDateString('de-DE', {
          ...formatOptions,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
      case '@datum.lang':
        return date.toLocaleDateString('de-DE', {
          ...formatOptions,
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        
      case '@monat':
        return (date.getMonth() + 1).toString();
        
      case '@monat.name':
        return date.toLocaleDateString('de-DE', {
          ...formatOptions,
          month: 'long'
        });
        
      case '@jahr':
        return date.getFullYear().toString();
        
      default:
        return null;
    }
  }
  
  /**
   * Resolve tenant placeholders
   */
  private resolveTenantPlaceholder(placeholder: string, mieter?: {
    id: string;
    name: string;
    email?: string;
    telefonnummer?: string;
    einzug?: string;
    auszug?: string;
    notiz?: string;
    nebenkosten?: number;
    wohnung_id?: string;
  }): string | null {
    if (!mieter) return null;
    
    switch (placeholder) {
      case '@mieter.name':
        return mieter.name || null;
        
      case '@mieter.email':
        return mieter.email || null;
        
      case '@mieter.telefon':
        return mieter.telefonnummer || null;
        
      case '@mieter.einzug':
        return mieter.einzug ? this.formatDate(mieter.einzug) : null;
        
      case '@mieter.auszug':
        return mieter.auszug ? this.formatDate(mieter.auszug) : null;
        
      case '@mieter.nebenkosten':
        // Return nebenkosten as currency if available
        if (mieter.nebenkosten !== undefined) {
          return this.formatCurrency(mieter.nebenkosten);
        }
        return null;
        
      default:
        return null;
    }
  }
  
  /**
   * Resolve apartment placeholders
   */
  private resolveApartmentPlaceholder(placeholder: string, wohnung?: {
    id: string;
    name: string;
    groesse?: number;
    miete?: number;
    haus_id?: string;
  }): string | null {
    if (!wohnung) return null;
    
    switch (placeholder) {
      case '@wohnung.name':
        return wohnung.name || null;
        
      case '@wohnung.adresse':
        // Return apartment name (address would need to be fetched separately)
        return wohnung.name || null;
        
      case '@wohnung.nummer':
        return wohnung.name || null; // Assuming name contains the apartment number
        
      case '@wohnung.groesse':
        return wohnung.groesse !== undefined ? `${wohnung.groesse} m²` : null;
        
      case '@wohnung.miete':
        return wohnung.miete !== undefined ? this.formatCurrency(wohnung.miete) : null;
        
      default:
        return null;
    }
  }
  
  /**
   * Resolve house placeholders
   */
  private resolveHousePlaceholder(placeholder: string, haus?: {
    id: string;
    name: string;
    ort?: string;
    groesse?: number;
    strasse?: string;
  }): string | null {
    if (!haus) return null;
    
    switch (placeholder) {
      case '@haus.name':
        return haus.name || null;
        
      case '@haus.ort':
        return haus.ort || null;
        
      case '@haus.strasse':
        return haus.strasse || null;
        
      case '@haus.groesse':
        return haus.groesse !== undefined ? `${haus.groesse} m²` : null;
        
      default:
        return null;
    }
  }
  
  /**
   * Resolve landlord placeholders
   */
  private resolveLandlordPlaceholder(placeholder: string, vermieter?: { id: string; name?: string; email?: string }): string | null {
    if (!vermieter) return null;
    
    switch (placeholder) {
      case '@vermieter.name':
        return vermieter.name || null;
        
      case '@vermieter.email':
        return vermieter.email || null;
        
      default:
        return null;
    }
  }
  
  /**
   * Generate fallback text for unresolved placeholders
   */
  private generateFallbackText(placeholder: string): string {
    const definition = this.placeholderMap.get(placeholder);
    if (definition) {
      return `[${definition.label}]`;
    }
    
    // For unknown placeholders, return the placeholder itself in brackets
    return `[${placeholder}]`;
  }
  
  /**
   * Format date string to German format
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
      }
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Berlin'
      });
    } catch {
      return dateString; // Return original if parsing fails
    }
  }
  
  /**
   * Format currency value
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
  
  /**
   * Capitalize first letter of a string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Validate that required context is available for placeholders
   */
  validateContext(content: string, context: TemplateContext): { isValid: boolean; missingContext: string[] } {
    const placeholders = this.extractPlaceholders(content);
    const missingContext: string[] = [];
    
    for (const placeholder of placeholders) {
      const definition = this.placeholderMap.get(placeholder);
      if (!definition?.requiresContext) continue;
      
      for (const requiredContext of definition.requiresContext) {
        switch (requiredContext) {
          case 'mieter':
            if (!context.mieter) {
              missingContext.push('Mieter');
            }
            break;
          case 'wohnung':
            if (!context.wohnung) {
              missingContext.push('Wohnung');
            }
            break;
          case 'haus':
            if (!context.haus) {
              missingContext.push('Haus');
            }
            break;
        }
      }
    }
    
    return {
      isValid: missingContext.length === 0,
      missingContext: [...new Set(missingContext)] // Remove duplicates
    };
  }
  
  /**
   * Get all placeholders used in template content
   */
  getUsedPlaceholders(content: string): PlaceholderDefinition[] {
    const placeholders = this.extractPlaceholders(content);
    return placeholders
      .map(p => this.placeholderMap.get(p))
      .filter((def): def is PlaceholderDefinition => def !== undefined);
  }
}

// Export singleton instance
export const templateProcessor = new TemplateProcessor();

// Note: Context fetcher is exported separately to avoid import issues in tests