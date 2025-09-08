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

// Feature flags for gradual rollout
export const FEATURE_FLAGS = {
  // Cloud storage navigation improvements
  ENABLE_CLIENT_NAVIGATION: process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION !== 'false', // Default enabled
  ENABLE_HYBRID_NAVIGATION: process.env.NEXT_PUBLIC_ENABLE_HYBRID_NAVIGATION !== 'false', // Default enabled
  ENABLE_NAVIGATION_CACHE: process.env.NEXT_PUBLIC_ENABLE_NAVIGATION_CACHE !== 'false', // Default enabled
  ENABLE_OPTIMISTIC_UI: process.env.NEXT_PUBLIC_ENABLE_OPTIMISTIC_UI !== 'false', // Default enabled
} as const;

// Video URLs
export const HERO_VIDEO_URL = 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/nebenkosten-overview.mp4';

// Document URLs
export const EXAMPLE_BILL_PDF_URL = 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/Beispielabrechnung.pdf';
