/**
 * Barrel export file for all TypeScript types
 * This provides a centralized location for importing types across the application
 */

// Re-export existing types
export type { Tenant, NebenkostenEntry, KautionStatus, KautionData, KautionFormData } from './Tenant';
export type { Wohnung } from './Wohnung';
export type { Finanzen } from './finanzen';
export type { Profile } from './supabase';
export type {
  Template,
  TemplatePayload,
  TemplateEditorProps,
  TemplatesModalProps,
  TemplateCardProps,
  TemplateEditorModalProps,
  TemplateModalProps
} from './template';

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
  WasserzaehlerFormData,
  MeterReadingFormEntry,
  MeterReadingFormData
} from '../lib/data-fetching';

// Re-export optimized betriebskosten types
export type {
  OptimizedNebenkosten,
  MeterModalData,
  // Alias for backward compatibility if strict type checking allows, otherwise might need explicit type alias
  // export type WasserzaehlerModalData = MeterModalData; // Can't do this inside export clause
  AbrechnungModalData,
  OptimizedActionResponse,
  SafeRpcCallResult,
  GetNebenkostenWithMetricsParams,
  GetMeterModalDataParams,
  GetAbrechnungModalDataParams,
  OptimizedWasserzaehlerFormEntry,
  OptimizedWasserzaehlerFormData
} from './optimized-betriebskosten';

// Explicit re-exports for aliasing
export type { MeterModalData as WasserzaehlerModalData } from './optimized-betriebskosten';
export type { GetMeterModalDataParams as GetWasserzaehlerModalDataParams } from './optimized-betriebskosten';

// Re-export documentation types
export type {
  DokumentationRecord,
  Category,
  Article,
  SearchResult,
  DocumentationFilters,
  SyncResult
} from './documentation';

// Re-export type guards
export {
  isOptimizedNebenkosten,
  isMeterModalData,
  isAbrechnungModalData
} from './optimized-betriebskosten';

export { isMeterModalData as isWasserzaehlerModalData } from './optimized-betriebskosten';