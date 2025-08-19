export const BERECHNUNGSART_OPTIONS = [
  { value: 'pro Flaeche', label: 'pro Fläche' },
  { value: 'pro Mieter', label: 'pro Mieter' },
  { value: 'pro Wohnung', label: 'pro Wohnung' },
  { value: 'nach Rechnung', label: 'nach Rechnung' },
] as const;

export type BerechnungsartValue = typeof BERECHNUNGSART_OPTIONS[number]['value'];

// You can also export an array of the values if that's useful
export const BERECHNUNGSART_VALUES = BERECHNUNGSART_OPTIONS.map(opt => opt.value);

// Logo URL configured via NEXT_PUBLIC_LOGO_URL environment variable
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL!;
