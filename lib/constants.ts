export const BERECHNUNGSART_OPTIONS = [
  { value: 'pro Flaeche', label: 'pro Fläche' },
  { value: 'pro Mieter', label: 'pro Mieter' },
  { value: 'pauschal', label: 'pauschal' },
] as const;

export type BerechnungsartValue = typeof BERECHNUNGSART_OPTIONS[number]['value'];

// You can also export an array of the values if that's useful
export const BERECHNUNGSART_VALUES = BERECHNUNGSART_OPTIONS.map(opt => opt.value);
