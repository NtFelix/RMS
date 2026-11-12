/**
 * Utility functions for Zaehler (meter) operations
 */

import { WATER_METER_TYPES, ZaehlerTyp } from "@/lib/zaehler-types";

const FORBIDDEN_ZAEHLER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Runtime check for a zaehlerkosten/zaehlerverbrauch JSONB object: a plain object (not an array,
 * Date, Map, etc.) with non-empty keys (excluding Object.prototype property names) whose values
 * are all finite numbers. Negative values are allowed (credits). Strings, NaN, Infinity, null
 * and nested arrays/objects are rejected.
 */
export const isValidZaehlerMap = (value: unknown): value is Record<string, number> => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) return false;
    if (Object.getOwnPropertySymbols(value).length > 0) return false;
    return Object.entries(value).every(
        ([key, v]) =>
            key.trim().length > 0 &&
            !FORBIDDEN_ZAEHLER_KEYS.has(key) &&
            !Object.prototype.hasOwnProperty.call(Object.prototype, key) &&
            typeof v === 'number' &&
            Number.isFinite(v)
    );
};

/**
 * Sum values from a zaehlerkosten/zaehlerverbrauch JSONB object
 * @param values - The JSONB object with meter type keys and numeric values
 * @param types - Optional array of meter types to sum (defaults to all water types)
 * @returns The sum of values for the specified types
 */
export const sumZaehlerValues = (
    values: Record<string, number> | null | undefined,
    types: readonly ZaehlerTyp[] = WATER_METER_TYPES
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
