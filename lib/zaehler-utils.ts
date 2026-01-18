/**
 * Utility functions for Zaehler (meter) operations
 */

import { WATER_METER_TYPES, ZaehlerTyp } from "@/lib/zaehler-types";

/**
 * Sum values from a zaehlerkosten/zaehlerverbrauch JSONB object
 * @param values - The JSONB object with meter type keys and numeric values
 * @param types - Optional array of meter types to sum (defaults to all water types)
 * @returns The sum of values for the specified types
 */
export const sumZaehlerValues = (
    values: Record<string, number> | null | undefined,
    types: readonly string[] = WATER_METER_TYPES
): number => {
    if (!values) return 0;
    return types.reduce((sum, typ) => sum + (values[typ] || 0), 0);
};

/**
 * Sum ALL values from a zaehlerkosten/zaehlerverbrauch JSONB object
 * @param values - The JSONB object with meter type keys and numeric values
 * @returns The sum of all values
 */
export const sumAllZaehlerValues = (
    values: Record<string, number> | null | undefined
): number => {
    if (!values) return 0;
    return Object.values(values).reduce((sum, v) => sum + v, 0);
};

/**
 * Convert zaehlerkosten from numbers to strings for form state
 * @param kosten - The JSONB object with meter type keys and numeric values
 * @returns Object with same keys but string values
 */
export const convertZaehlerkostenToStrings = (
    kosten: Record<string, number>
): Record<string, string> => {
    return Object.fromEntries(
        Object.entries(kosten).map(([key, value]) => [key, String(value)])
    );
};
