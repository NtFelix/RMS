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

import { Nebenkosten, Mieter, WasserZaehler, WasserAblesung, Rechnung } from "@/lib/data-fetching";

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
  water_meters: WasserZaehler[];  // From Zaehler table
  water_readings: WasserAblesung[]; // From Zaehler_Ablesungen table
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

// ============================================================================
// ENHANCED ABRECHNUNG CALCULATION TYPES
// ============================================================================

/**
 * Detailed cost breakdown for operating costs (excluding water)
 */
export type OperatingCostBreakdown = {
  costItems: Array<{
    costName: string;
    totalCostForItem: number;
    calculationType: string;
    tenantShare: number;
    pricePerSqm?: number;
    distributionBasis?: string | number;
  }>;
  totalCost: number;
};

/**
 * Water cost calculation details
 */
export type WaterCostBreakdown = {
  totalBuildingWaterCost: number;
  totalBuildingConsumption: number;
  pricePerCubicMeter: number;
  tenantConsumption: number;
  totalCost: number;
  meterReading?: {
    previousReading: number;
    currentReading: number;
    consumptionPeriod: string;
  };
};

/**
 * Prepayment calculation with monthly breakdown
 */
export type PrepaymentBreakdown = {
  monthlyPayments: Array<{
    month: string;
    amount: number;
    isActiveMonth: boolean;
    occupancyPercentage: number;
  }>;
  totalPrepayments: number;
  averageMonthlyPayment: number;
};

/**
 * Occupancy calculation result
 */
export type OccupancyCalculation = {
  percentage: number;
  daysOccupied: number;
  daysInPeriod: number;
  moveInDate?: string;
  moveOutDate?: string;
  effectivePeriodStart: string;
  effectivePeriodEnd: string;
};

/**
 * Complete calculation result for a single tenant
 */
export type TenantCalculationResult = {
  tenantId: string;
  tenantName: string;
  apartmentName: string;
  apartmentSize: number;
  occupancyPercentage: number;
  daysOccupied: number;
  daysInPeriod: number;
  operatingCosts: OperatingCostBreakdown;
  waterCosts: WaterCostBreakdown;
  totalCosts: number;
  prepayments: PrepaymentBreakdown;
  finalSettlement: number;
  recommendedPrepayment?: number;
};

/**
 * Summary statistics for all tenant calculations
 */
export type AbrechnungSummary = {
  totalTenants: number;
  totalOperatingCosts: number;
  totalWaterCosts: number;
  totalPrepayments: number;
  totalSettlements: number;
  averageSettlement: number;
  tenantsWithRefund: number;
  tenantsWithAdditionalPayment: number;
};

/**
 * Complete result of the abrechnung calculation process
 */
export type AbrechnungCalculationResult = {
  nebenkostenId: string;
  calculationDate: string;
  billingPeriod: {
    startDate: string;
    endDate: string;
  };
  propertyInfo: {
    houseName: string;
    totalArea: number;
    apartmentCount: number;
  };
  tenantCalculations: TenantCalculationResult[];
  summary: AbrechnungSummary;
  calculationOptions: {
    includeRecommendations?: boolean;
    validateWaterReadings?: boolean;
    calculateMonthlyBreakdown?: boolean;
  };
};

/**
 * Validation result for calculation input data
 */
export type CalculationValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Parameters for enhanced abrechnung calculation
 */
export type AbrechnungCalculationOptions = {
  includeRecommendations?: boolean;
  validateWaterReadings?: boolean;
  calculateMonthlyBreakdown?: boolean;
  generatePdfPreview?: boolean;
  saveCalculationResults?: boolean;
};

/**
 * Type guard to check if data is TenantCalculationResult
 */
export function isTenantCalculationResult(data: any): data is TenantCalculationResult {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    typeof data.tenantId === 'string' &&
    typeof data.tenantName === 'string' &&
    typeof data.totalCosts === 'number' &&
    typeof data.finalSettlement === 'number' &&
    data.operatingCosts !== null &&
    data.waterCosts !== null &&
    data.prepayments !== null
  );
}

/**
 * Type guard to check if data is AbrechnungCalculationResult
 */
export function isAbrechnungCalculationResult(data: any): data is AbrechnungCalculationResult {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    typeof data.nebenkostenId === 'string' &&
    typeof data.calculationDate === 'string' &&
    data.billingPeriod !== null &&
    data.propertyInfo !== null &&
    Array.isArray(data.tenantCalculations) &&
    data.summary !== null
  );
}