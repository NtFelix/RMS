export const PAYMENT_KEYWORDS = {
    RENT: 'mietzahlung',
    NEBENKOSTEN: 'nebenkosten',
    NACHZAHLUNG: 'nachzahlung',
} as const;

// Auto-apply tags for different payment types
// These tags match the FINANCE_TAGS categories in components/ui/tag-input.tsx
export const PAYMENT_TAGS = {
    RENT: 'Miete',
    NEBENKOSTEN: 'Nebenkosten',
    NACHZAHLUNG: 'Nachzahlung',
} as const;
