/**
 * Meter type definitions and configuration
 * This file contains only types and constants that can be used in both
 * server and client components without importing server-side dependencies.
 */

// Supported meter types
export type ZaehlerTyp =
    | 'kaltwasser'       // Cold water (default for water meters)
    | 'warmwasser'       // Warm water
    | 'waermemenge'      // Heat meter
    | 'heizkostenverteiler' // Heat cost allocator
    | 'strom'            // Electricity
    | 'gas';             // Gas

// Configuration for each meter type
export const ZAEHLER_CONFIG: Record<ZaehlerTyp, {
    label: string;
    einheit: string;
    alternativeEinheiten?: string[];
    icon: 'droplet' | 'thermometer' | 'flame' | 'gauge' | 'zap' | 'fuel';
    color: string;
}> = {
    kaltwasser: {
        label: 'Kaltwasserzähler',
        einheit: 'm³',
        icon: 'droplet',
        color: 'blue',
    },
    warmwasser: {
        label: 'Warmwasserzähler',
        einheit: 'm³',
        icon: 'thermometer',
        color: 'red',
    },
    waermemenge: {
        label: 'Wärmemengenzähler',
        einheit: 'kWh',
        alternativeEinheiten: ['MWh'],
        icon: 'flame',
        color: 'orange',
    },
    heizkostenverteiler: {
        label: 'Heizkostenverteiler',
        einheit: 'Einheiten',
        alternativeEinheiten: ['Punkte'],
        icon: 'gauge',
        color: 'purple',
    },
    strom: {
        label: 'Stromzähler',
        einheit: 'kWh',
        icon: 'zap',
        color: 'yellow',
    },
    gas: {
        label: 'Gaszähler',
        einheit: 'm³',
        alternativeEinheiten: ['kWh'],
        icon: 'fuel',
        color: 'cyan',
    },
};

// Helper function to get label for a meter type
export function getZaehlerLabel(typ: ZaehlerTyp): string {
    return ZAEHLER_CONFIG[typ]?.label || 'Zähler';
}

// Helper function to get unit for a meter type
export function getZaehlerEinheit(typ: ZaehlerTyp): string {
    return ZAEHLER_CONFIG[typ]?.einheit || 'm³';
}
