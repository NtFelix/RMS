// Template System Types
// Core interfaces for the template system functionality

// Context types that templates can require
export type ContextType = 'mieter' | 'wohnung' | 'haus' | 'vermieter' | 'mail' | 'vertrag' | 'kuendigung';

// Template data structure matching the Vorlagen database table
export interface Template {
  id: string;
  user_id: string;
  titel: string;
  inhalt: string;
  kategorie: string;
  kontext_anforderungen: ContextType[];
  erstellungsdatum: string;
  aktualisiert_am: string;
}

// Placeholder definition for autocomplete and validation
export interface PlaceholderDefinition {
  key: string;
  label: string;
  description: string;
  category: 'datum' | 'mieter' | 'wohnung' | 'haus' | 'vermieter';
  requiresContext?: ContextType[];
}

// Template context for processing placeholders
export interface TemplateContext {
  mieter?: {
    id: string;
    name: string;
    email?: string;
    telefonnummer?: string;
    einzug?: string;
    auszug?: string;
    notiz?: string;
    nebenkosten?: number;
    wohnung_id?: string;
  };
  wohnung?: {
    id: string;
    name: string;
    groesse?: number;
    miete?: number;
    haus_id?: string;
  };
  haus?: {
    id: string;
    name: string;
    ort?: string;
    groesse?: number;
    strasse?: string;
  };
  datum?: Date;
  vermieter?: {
    id: string;
    name?: string;
    email?: string;
  };
}

// Autocomplete suggestion for placeholder insertion
export interface AutocompleteSuggestion {
  placeholder: PlaceholderDefinition;
  insertText: string;
  displayText: string;
}

// Template creation form data
export interface TemplateCreateData {
  titel: string;
  inhalt: string;
  kategorie: string;
  kontext_anforderungen: ContextType[];
}

// Template usage form data
export interface TemplateUsageData {
  template: Template;
  context: TemplateContext;
}

// Template processing result
export interface TemplateProcessingResult {
  processedContent: string;
  unresolvedPlaceholders: string[];
  success: boolean;
  errors?: string[];
}

// Template validation result
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  placeholders: string[];
}

// Context requirements mapping for different template categories
export const CONTEXT_MAPPINGS = {
  mail: ['mieter', 'vermieter'],
  vertrag: ['mieter', 'wohnung', 'haus'],
  kuendigung: ['mieter', 'wohnung'],
  rechnung: ['mieter', 'wohnung'],
  mahnung: ['mieter', 'wohnung'],
  allgemein: []
} as const;

// Template error types
export interface TemplateError {
  type: 'validation' | 'processing' | 'context' | 'database';
  message: string;
  field?: string;
  placeholder?: string;
}

// Template modal props interfaces
export interface TemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: Template) => void;
}

export interface TemplateUsageModalProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (processedContent: string) => void;
}

export interface TemplateContextSelectorProps {
  template: Template;
  onContextChange: (context: TemplateContext) => void;
  availableEntities: {
    mieter: Array<{ id: string; name: string; wohnung_id?: string }>;
    wohnungen: Array<{ id: string; name: string; haus_id?: string }>;
    haeuser: Array<{ id: string; name: string }>;
  };
}

export interface TemplatePreviewProps {
  template: Template;
  context: TemplateContext;
  onValidationChange: (result: TemplateValidationResult) => void;
}