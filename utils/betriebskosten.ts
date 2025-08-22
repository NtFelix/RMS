import { BerechnungsartValue, BERECHNUNGSART_OPTIONS } from "../lib/constants";

export const normalizeBerechnungsart = (rawValue: string): BerechnungsartValue => {
  const berechnungsartMap: Record<string, BerechnungsartValue> = {
    'pro person': 'pro Mieter',
    'pro mieter': 'pro Mieter',
    'pro flaeche': 'pro Flaeche',
    'pro fläche': 'pro Flaeche',
    'pro qm': 'pro Flaeche',
    'qm': 'pro Flaeche',
    'pro wohnung': 'pro Wohnung',
    'nach rechnung': 'nach Rechnung',
  };

  const lower = rawValue.toLowerCase();
  const normalized = berechnungsartMap[lower] || rawValue;
  return (BERECHNUNGSART_OPTIONS.find(opt => opt.value === normalized)?.value as BerechnungsartValue) || '';
};
