export const BERECHNUNGSART_OPTIONS = [
  { value: 'pro Flaeche', label: 'pro Fläche' },
  { value: 'pro Mieter', label: 'pro Mieter' },
  { value: 'nach Rechnung', label: 'nach Rechnung' },
] as const;

export type BerechnungsartValue = typeof BERECHNUNGSART_OPTIONS[number]['value'];

// You can also export an array of the values if that's useful
export const BERECHNUNGSART_VALUES = BERECHNUNGSART_OPTIONS.map(opt => opt.value);

export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/favicon.png';
