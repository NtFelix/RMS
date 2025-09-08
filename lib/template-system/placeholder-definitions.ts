// Placeholder Definitions Registry
// Centralized registry of all supported placeholders for the template system

import type { PlaceholderDefinition, ContextType } from '@/types/template-system';

// Complete registry of all supported placeholders
export const PLACEHOLDER_DEFINITIONS: PlaceholderDefinition[] = [
  // Date placeholders - no context required
  {
    key: '@datum',
    label: 'Aktuelles Datum',
    description: 'Heutiges Datum im Format DD.MM.YYYY',
    category: 'datum'
  },
  {
    key: '@datum.lang',
    label: 'Datum (ausgeschrieben)',
    description: 'Heutiges Datum im Format DD. MMMM YYYY',
    category: 'datum'
  },
  {
    key: '@monat',
    label: 'Aktueller Monat',
    description: 'Aktueller Monat als Zahl (1-12)',
    category: 'datum'
  },
  {
    key: '@monat.name',
    label: 'Monatsname',
    description: 'Aktueller Monat als Name (z.B. Januar)',
    category: 'datum'
  },
  {
    key: '@jahr',
    label: 'Aktuelles Jahr',
    description: 'Aktuelles Jahr (YYYY)',
    category: 'datum'
  },

  // Tenant placeholders - require mieter context
  {
    key: '@mieter.name',
    label: 'Mieter Name',
    description: 'Vollständiger Name des Mieters',
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
    key: '@mieter.einzug',
    label: 'Mieter Einzugsdatum',
    description: 'Einzugsdatum des Mieters (DD.MM.YYYY)',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.auszug',
    label: 'Mieter Auszugsdatum',
    description: 'Auszugsdatum des Mieters (DD.MM.YYYY)',
    category: 'mieter',
    requiresContext: ['mieter']
  },
  {
    key: '@mieter.nebenkosten',
    label: 'Mieter Nebenkosten',
    description: 'Nebenkostenvorauszahlung des Mieters',
    category: 'mieter',
    requiresContext: ['mieter']
  },

  // Apartment placeholders - require wohnung context
  {
    key: '@wohnung.name',
    label: 'Wohnung Bezeichnung',
    description: 'Name/Bezeichnung der Wohnung',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
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
    description: 'Wohnungsgröße in Quadratmetern',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },
  {
    key: '@wohnung.miete',
    label: 'Wohnung Miete',
    description: 'Kaltmiete der Wohnung',
    category: 'wohnung',
    requiresContext: ['wohnung']
  },

  // House placeholders - require haus context
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
    description: 'Straße und Hausnummer',
    category: 'haus',
    requiresContext: ['haus']
  },
  {
    key: '@haus.groesse',
    label: 'Haus Größe',
    description: 'Gesamtgröße des Hauses in Quadratmetern',
    category: 'haus',
    requiresContext: ['haus']
  },

  // Landlord placeholders - no context required (uses current user)
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
  }
];

// Helper functions for working with placeholders

/**
 * Get all placeholders for a specific category
 */
export function getPlaceholdersByCategory(category: PlaceholderDefinition['category']): PlaceholderDefinition[] {
  return PLACEHOLDER_DEFINITIONS.filter(p => p.category === category);
}

/**
 * Get placeholders that require specific context types
 */
export function getPlaceholdersByContext(contextType: ContextType): PlaceholderDefinition[] {
  return PLACEHOLDER_DEFINITIONS.filter(p => 
    p.requiresContext?.includes(contextType)
  );
}

/**
 * Search placeholders by key or label (fuzzy search)
 */
export function searchPlaceholders(query: string): PlaceholderDefinition[] {
  const lowerQuery = query.toLowerCase();
  return PLACEHOLDER_DEFINITIONS.filter(p => 
    p.key.toLowerCase().includes(lowerQuery) ||
    p.label.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get placeholder definition by key
 */
export function getPlaceholderByKey(key: string): PlaceholderDefinition | undefined {
  return PLACEHOLDER_DEFINITIONS.find(p => p.key === key);
}

/**
 * Get all placeholders that don't require context
 */
export function getContextFreePlaceholders(): PlaceholderDefinition[] {
  return PLACEHOLDER_DEFINITIONS.filter(p => !p.requiresContext || p.requiresContext.length === 0);
}

/**
 * Validate if a placeholder exists and is valid
 */
export function isValidPlaceholder(key: string): boolean {
  return PLACEHOLDER_DEFINITIONS.some(p => p.key === key);
}

/**
 * Get required context types for a list of placeholders
 */
export function getRequiredContextTypes(placeholderKeys: string[]): ContextType[] {
  const contextTypes = new Set<ContextType>();
  
  placeholderKeys.forEach(key => {
    const placeholder = getPlaceholderByKey(key);
    if (placeholder?.requiresContext) {
      placeholder.requiresContext.forEach(context => contextTypes.add(context));
    }
  });
  
  return Array.from(contextTypes);
}

/**
 * Group placeholders by category for UI display
 */
export function getPlaceholdersGroupedByCategory(): Record<string, PlaceholderDefinition[]> {
  return PLACEHOLDER_DEFINITIONS.reduce((groups, placeholder) => {
    const category = placeholder.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(placeholder);
    return groups;
  }, {} as Record<string, PlaceholderDefinition[]>);
}

// Category display names for UI
export const CATEGORY_DISPLAY_NAMES = {
  datum: 'Datum',
  mieter: 'Mieter',
  wohnung: 'Wohnung', 
  haus: 'Haus',
  vermieter: 'Vermieter'
} as const;