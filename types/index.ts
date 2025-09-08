/**
 * Barrel export file for all TypeScript types
 * This provides a centralized location for importing types across the application
 */

// Re-export existing types
export type { Tenant, NebenkostenEntry, KautionStatus, KautionData, KautionFormData } from './Tenant';
export type { Wohnung } from './Wohnung';
export type { Finanzen } from './finanzen';
export type { Profile } from './supabase';

// Re-export data fetching types
export type { 
  Nebenkosten, 
  Mieter, 
  Haus, 
  Wohnung as WohnungData, 
  Aufgabe, 
  HausMitFlaeche,
  Rechnung,
  RechnungSql,
  Finanzen as FinanzenData,
  Wasserzaehler,
  WasserzaehlerFormEntry,
  WasserzaehlerFormData
} from '../lib/data-fetching';

// Re-export optimized betriebskosten types
export type {
  OptimizedNebenkosten,
  WasserzaehlerModalData,
  AbrechnungModalData,
  OptimizedActionResponse,
  SafeRpcCallResult,
  GetNebenkostenWithMetricsParams,
  GetWasserzaehlerModalDataParams,
  GetAbrechnungModalDataParams,
  OptimizedWasserzaehlerFormEntry,
  OptimizedWasserzaehlerFormData
} from './optimized-betriebskosten';

// Re-export template system types
export type {
  Template,
  PlaceholderDefinition,
  TemplateContext,
  AutocompleteSuggestion,
  TemplateCreateData,
  TemplateUsageData,
  TemplateProcessingResult,
  TemplateValidationResult,
  TemplateError,
  TemplateCreateModalProps,
  TemplateUsageModalProps,
  TemplateContextSelectorProps,
  TemplatePreviewProps,
  ContextType
} from './template-system';

export { CONTEXT_MAPPINGS } from './template-system';

// Re-export type guards
export {
  isOptimizedNebenkosten,
  isWasserzaehlerModalData,
  isAbrechnungModalData
} from './optimized-betriebskosten';