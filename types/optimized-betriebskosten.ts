/**
 * Optimized TypeScript types for betriebskosten performance optimization
 * 
 * These types support the new database functions and optimized data structures
 * as defined in the betriebskosten-performance-optimization spec.
 * 
 * Key improvements:
 * - OptimizedNebenkosten: Includes pre-calculated house metrics to eliminate O(n) database calls
 * - WasserzaehlerModalData: Structured data for efficient modal loading
 * - AbrechnungModalData: Consolidated data for Abrechnung modal operations
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/design.md
 */

import { Nebenkosten, Mieter, Wasserzaehler, Rechnung } from "@/lib/data-fetching";

/**
 * OptimizedNebenkosten extends the existing Nebenkosten type with calculated fields
 * returned by the get_nebenkosten_with_metrics database function.
 * This eliminates the need for individual getHausGesamtFlaeche calls.
 */
export type OptimizedNebenkosten = {
  // Existing database fields (unchanged from Nebenkosten table)
  id: string;
  startdatum: string; // ISO date string (YYYY-MM-DD)
  enddatum: string;   // ISO date string (YYYY-MM-DD)
  nebenkostenart: string[] | null;
  betrag: number[] | null;
  berechnungsart: string[] | null;
  wasserkosten: number | null;
  wasserverbrauch: number | null;
  haeuser_id: string;
  user_id: string;
  
  // Calculated fields returned by database function (not stored in tables)
  haus_name: string;
  gesamt_flaeche: number;
  anzahl_wohnungen: number;
  anzahl_mieter: number;
  
  // Compatibility fields for existing components
  Haeuser?: { name: string } | null;
  gesamtFlaeche?: number;
  anzahlWohnungen?: number;
  anzahlMieter?: number;
};

/**
 * WasserzaehlerModalData represents the structured data returned by the
 * get_wasserzaehler_modal_data database function for efficient modal loading.
 * This replaces multiple separate server action calls with a single database function call.
 */
export type WasserzaehlerModalData = {
  mieter_id: string;
  mieter_name: string;
  wohnung_name: string;
  wohnung_groesse: number;
  current_reading: {
    ablese_datum: string | null;
    zaehlerstand: number | null;
    verbrauch: number | null;
  } | null;
  previous_reading: {
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
  } | null;
};

/**
 * AbrechnungModalData represents the structured data returned by the
 * get_abrechnung_modal_data database function for efficient Abrechnung modal loading.
 * This consolidates all required data for the modal into a single database call.
 */
export type AbrechnungModalData = {
  nebenkosten_data: Nebenkosten;  // From existing Nebenkosten table
  tenants: Mieter[];              // From existing Mieter table
  rechnungen: Rechnung[];         // From existing Rechnungen table
  wasserzaehler_readings: Wasserzaehler[]; // From existing Wasserzaehler table
};

/**
 * Response type for optimized server actions that use database functions
 */
export type OptimizedActionResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

/**
 * Parameters for the get_nebenkosten_with_metrics database function
 */
export type GetNebenkostenWithMetricsParams = {
  user_id: string;
};

/**
 * Parameters for the get_wasserzaehler_modal_data database function
 */
export type GetWasserzaehlerModalDataParams = {
  nebenkosten_id: string;
  user_id: string;
};

/**
 * Parameters for the get_abrechnung_modal_data database function
 */
export type GetAbrechnungModalDataParams = {
  nebenkosten_id: string;
  user_id: string;
};

/**
 * Utility type for safe RPC calls to database functions
 */
export type SafeRpcCallResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

/**
 * Enhanced WasserzaehlerFormEntry that includes additional data from optimized queries
 */
export type OptimizedWasserzaehlerFormEntry = {
  mieter_id: string;
  mieter_name: string;
  wohnung_name: string;
  wohnung_groesse: number;
  ablese_datum: string | null;
  zaehlerstand: number | string;
  verbrauch: number | string;
  previous_reading?: {
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
  } | null;
};

/**
 * Enhanced form data structure for optimized Wasserzähler operations
 */
export type OptimizedWasserzaehlerFormData = {
  entries: OptimizedWasserzaehlerFormEntry[];
  nebenkosten_id: string;
};

/**
 * Type guard to check if data is OptimizedNebenkosten
 */
export function isOptimizedNebenkosten(data: any): data is OptimizedNebenkosten {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.haus_name === 'string' &&
    typeof data.gesamt_flaeche === 'number' &&
    typeof data.anzahl_wohnungen === 'number' &&
    typeof data.anzahl_mieter === 'number'
  );
}

/**
 * Type guard to check if data is WasserzaehlerModalData
 */
export function isWasserzaehlerModalData(data: any): data is WasserzaehlerModalData {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    typeof data.mieter_id === 'string' &&
    typeof data.mieter_name === 'string' &&
    typeof data.wohnung_name === 'string' &&
    typeof data.wohnung_groesse === 'number'
  );
}

/**
 * Type guard to check if data is AbrechnungModalData
 */
export function isAbrechnungModalData(data: any): data is AbrechnungModalData {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    data.nebenkosten_data !== null &&
    data.nebenkosten_data !== undefined &&
    typeof data.nebenkosten_data === 'object' &&
    Array.isArray(data.tenants) &&
    Array.isArray(data.rechnungen) &&
    Array.isArray(data.wasserzaehler_readings)
  );
}