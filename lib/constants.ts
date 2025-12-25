export const BERECHNUNGSART_OPTIONS = [
  { value: 'pro Flaeche', label: 'pro Fläche' },
  { value: 'pro Mieter', label: 'pro Mieter' },
  { value: 'pro Wohnung', label: 'pro Wohnung' },
  { value: 'nach Rechnung', label: 'nach Rechnung' },
] as const;

export type BerechnungsartValue = typeof BERECHNUNGSART_OPTIONS[number]['value'];

// You can also export an array of the values if that's useful
export const BERECHNUNGSART_VALUES = BERECHNUNGSART_OPTIONS.map(opt => opt.value);

// Supabase PWA images storage URL
export const PWA_IMAGES_URL = 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images';

// Logo URL
export const LOGO_URL = `${PWA_IMAGES_URL}/mascot/normal.avif`;

// Brand Name
export const BRAND_NAME_PART_1 = 'Miet';
export const BRAND_NAME_PART_2 = 'evo';
export const BRAND_NAME = `${BRAND_NAME_PART_1}${BRAND_NAME_PART_2}`;
export const CONTACT_EMAIL = "support@mietevo.de";

// Base URL - centralized to ensure consistency across all environments
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de';


// Feature flags removed as functionality is now standard
// PostHog feature flag keys - centralized to prevent magic strings
export const POSTHOG_FEATURE_FLAGS = {
  // Pricing page
  SHOW_WAITLIST_BUTTON: 'show-waitlist-button',
  PRICING_PAGE_PREVIEW_LIMIT_NOTICE: 'pricing-page-preview-limit-notice',
  // Navigation
  DOCUMENTS_TAB_ACCESS: 'documents_tab_access',
  MAILS_TAB: 'mails-tab',
  // Features
  TEMPLATE_MODAL_ENABLED: 'template-modal-enabled',
  CREATE_FILE_OPTION: 'create-file-option',
  DARK_MODE: 'dark-mode',
  AI_DOCUMENTATION_MODE: 'ai-documentation-mode',
  // Landing page
  SHOW_PRODUKTE_DROPDOWN: 'show-produkte-dropdown',
  SHOW_LOESUNGEN_DROPDOWN: 'show-loesungen-dropdown',
} as const;

// Application routes - centralized to prevent hardcoded paths
export const ROUTES = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  UPDATE_PASSWORD: '/auth/update-password',
  // Dashboard
  HOME: '/home',
  PROPERTIES: '/objekte',
  TENANTS: '/mieter',
  FINANCES: '/finanzen',
  DOCUMENTS: '/dateien',
  SETTINGS: '/einstellungen',
  // Landing
  LANDING: '/',
  PRICING: '/preise',
  FEATURES: '/funktionen',
  // Legal & Resources
  DOCUMENTATION: '/hilfe/dokumentation',
  PRIVACY: '/datenschutz',
  TERMS: '/agb',
} as const;

// Video URLs
export const HERO_VIDEO_URL = 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/nebenkosten-overview.mp4';

// Document URLs
export const EXAMPLE_BILL_PDF_URL = 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/Beispielabrechnung.pdf';

// Demo calendar URL
export const DEMO_CALENDAR_URL = 'https://calendar.notion.so/meet/felix-b0111/demo-anfordern';

// Countries for billing address
export const BILLING_COUNTRIES = {
  // DACH countries (prioritized)
  dach: [
    { value: 'DE', label: 'Deutschland' },
    { value: 'AT', label: 'Österreich' },
    { value: 'CH', label: 'Schweiz' },
  ],
  // Rest of Europe
  europe: [
    { value: 'AL', label: 'Albanien' },
    { value: 'AD', label: 'Andorra' },
    { value: 'BE', label: 'Belgien' },
    { value: 'BA', label: 'Bosnien und Herzegowina' },
    { value: 'BG', label: 'Bulgarien' },
    { value: 'HR', label: 'Kroatien' },
    { value: 'CY', label: 'Zypern' },
    { value: 'CZ', label: 'Tschechien' },
    { value: 'DK', label: 'Dänemark' },
    { value: 'EE', label: 'Estland' },
    { value: 'FI', label: 'Finnland' },
    { value: 'FR', label: 'Frankreich' },
    { value: 'GR', label: 'Griechenland' },
    { value: 'GB', label: 'Großbritannien' },
    { value: 'HU', label: 'Ungarn' },
    { value: 'IS', label: 'Island' },
    { value: 'IE', label: 'Irland' },
    { value: 'IT', label: 'Italien' },
    { value: 'XK', label: 'Kosovo' },
    { value: 'LV', label: 'Lettland' },
    { value: 'LI', label: 'Liechtenstein' },
    { value: 'LT', label: 'Litauen' },
    { value: 'LU', label: 'Luxemburg' },
    { value: 'MT', label: 'Malta' },
    { value: 'MD', label: 'Moldawien' },
    { value: 'MC', label: 'Monaco' },
    { value: 'ME', label: 'Montenegro' },
    { value: 'NL', label: 'Niederlande' },
    { value: 'MK', label: 'Nordmazedonien' },
    { value: 'NO', label: 'Norwegen' },
    { value: 'PL', label: 'Polen' },
    { value: 'PT', label: 'Portugal' },
    { value: 'RO', label: 'Rumänien' },
    { value: 'SM', label: 'San Marino' },
    { value: 'SE', label: 'Schweden' },
    { value: 'RS', label: 'Serbien' },
    { value: 'SK', label: 'Slowakei' },
    { value: 'SI', label: 'Slowenien' },
    { value: 'ES', label: 'Spanien' },
    { value: 'TR', label: 'Türkei' },
    { value: 'UA', label: 'Ukraine' },
    { value: 'VA', label: 'Vatikanstadt' },
  ],
  // Major non-European countries
  other: [
    { value: 'US', label: 'Vereinigte Staaten' },
    { value: 'CA', label: 'Kanada' },
    { value: 'AU', label: 'Australien' },
    { value: 'NZ', label: 'Neuseeland' },
    { value: 'JP', label: 'Japan' },
    { value: 'CN', label: 'China' },
    { value: 'IN', label: 'Indien' },
    { value: 'BR', label: 'Brasilien' },
  ],
} as const;
