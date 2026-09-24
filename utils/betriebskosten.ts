import { BerechnungsartValue, BERECHNUNGSART_OPTIONS } from "../lib/constants";

// Legacy and lowercase spellings of the canonical Berechnungsart values
const BERECHNUNGSART_ALIASES: Record<string, BerechnungsartValue> = {
  'pro person': 'pro Mieter',
  'pro mieter': 'pro Mieter',
  'pro flaeche': 'pro Flaeche',
  'pro fläche': 'pro Flaeche',
  'pro qm': 'pro Flaeche',
  'qm': 'pro Flaeche',
  'pro wohnung': 'pro Wohnung',
  'nach rechnung': 'nach Rechnung',
};

export const normalizeBerechnungsart = (rawValue: string): BerechnungsartValue => {
  const trimmed = rawValue.trim();
  const normalized = BERECHNUNGSART_ALIASES[trimmed.toLowerCase()] || trimmed;
  return (BERECHNUNGSART_OPTIONS.find(opt => opt.value === normalized)?.value as BerechnungsartValue) || '';
};

/**
 * Einzelrechnungen (Rechnungen) are linked to their 'nach Rechnung' cost item by name.
 * Compare names ignoring surrounding whitespace: older rows were saved untrimmed
 * while nebenkostenart has always been trimmed.
 */
export const isSameCostName = (a: string | null | undefined, b: string | null | undefined): boolean =>
  (a ?? '').trim() === (b ?? '').trim();

/**
 * Returns the first (trimmed) name used by more than one 'nach Rechnung' cost item, or null.
 * Such items can't be told apart when matching Rechnungen by name.
 */
export const findDuplicateNachRechnungName = (
  nebenkostenart: readonly string[],
  berechnungsart: readonly (string | null | undefined)[]
): string | null => {
  const seen = new Set<string>();
  for (let i = 0; i < nebenkostenart.length; i++) {
    if (berechnungsart[i] !== 'nach Rechnung') continue;
    const name = (nebenkostenart[i] ?? '').trim();
    if (!name) continue;
    if (seen.has(name)) return name;
    seen.add(name);
  }
  return null;
};
