import { generateId } from "@/lib/utils/generate-id";
import { BerechnungsartValue } from "../constants";

interface CostItem {
  id: string;
  art: string;
  betrag: string;
  berechnungsart: BerechnungsartValue;
}

/**
 * Default cost items for new Betriebskostenabrechnung
 * Note: We don't generate IDs here to ensure they're consistent across renders
 */
const createDefaultCostItems = (): CostItem[] => [
  {
    id: generateId(),
    art: 'Grundsteuer',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  },
  {
    id: generateId(),
    art: 'Wasserkosten',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  },
  {
    id: generateId(),
    art: 'Heizkosten',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  },
  {
    id: generateId(),
    art: 'Warmwasser',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  },
  {
    id: generateId(),
    art: 'Müllabfuhr',
    betrag: '',
    berechnungsart: 'pro Wohnung'
  },
  {
    id: generateId(),
    art: 'Gebäudereinigung',
    betrag: '',
    berechnungsart: 'pro Wohnung'
  },
  {
    id: generateId(),
    art: 'Gartenpflege',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  },
  {
    id: generateId(),
    art: 'Hausversicherung',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  },
  {
    id: generateId(),
    art: 'Aufzugskosten',
    betrag: '',
    berechnungsart: 'pro Wohnung'
  },
  {
    id: generateId(),
    art: 'Sonstige Betriebskosten',
    betrag: '',
    berechnungsart: 'pro Flaeche'
  }
];

export const DEFAULT_COST_ITEMS = createDefaultCostItems();

// Re-export for backward compatibility
export default {
  DEFAULT_COST_ITEMS
};
