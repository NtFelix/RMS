// Template categories for German property management
export const TEMPLATE_CATEGORIES = [
  'Mail',
  'Brief', 
  'Vertrag',
  'Rechnung',
  'Mahnung',
  'Kündigung',
  'Sonstiges'
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

// Category configuration for visual grouping
export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  order: number;
}

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  mieter: {
    id: 'mieter',
    label: 'Mieter',
    icon: 'User',
    color: 'text-blue-600',
    order: 1,
  },
  wohnung: {
    id: 'wohnung',
    label: 'Wohnung',
    icon: 'Home',
    color: 'text-green-600',
    order: 2,
  },
  haus: {
    id: 'haus',
    label: 'Haus',
    icon: 'Building',
    color: 'text-purple-600',
    order: 3,
  },
  datum: {
    id: 'datum',
    label: 'Datum',
    icon: 'Calendar',
    color: 'text-orange-600',
    order: 4,
  },
  vermieter: {
    id: 'vermieter',
    label: 'Vermieter',
    icon: 'UserCheck',
    color: 'text-indigo-600',
    order: 5,
  },
};

// Mention variables for TipTap editor
export interface MentionVariable {
  id: string;
  label: string;
  description: string;
  category?: 'mieter' | 'wohnung' | 'haus' | 'datum' | 'vermieter';
}

export const MENTION_VARIABLES: MentionVariable[] = [
  // Mieter (Tenant) variables
  { 
    id: 'mieter.name', 
    label: 'Mieter.Name', 
    description: 'Vollständiger Name des Mieters',
    category: 'mieter'
  },
  { 
    id: 'mieter.vorname', 
    label: 'Mieter.Vorname', 
    description: 'Vorname des Mieters',
    category: 'mieter'
  },
  { 
    id: 'mieter.nachname', 
    label: 'Mieter.Nachname', 
    description: 'Nachname des Mieters',
    category: 'mieter'
  },
  { 
    id: 'mieter.email', 
    label: 'Mieter.Email', 
    description: 'E-Mail-Adresse des Mieters',
    category: 'mieter'
  },
  { 
    id: 'mieter.telefon', 
    label: 'Mieter.Telefon', 
    description: 'Telefonnummer des Mieters',
    category: 'mieter'
  },
  
  // Wohnung (Apartment) variables
  { 
    id: 'wohnung.adresse', 
    label: 'Wohnung.Adresse', 
    description: 'Vollständige Adresse der Wohnung',
    category: 'wohnung'
  },
  { 
    id: 'wohnung.strasse', 
    label: 'Wohnung.Straße', 
    description: 'Straße der Wohnung',
    category: 'wohnung'
  },
  { 
    id: 'wohnung.hausnummer', 
    label: 'Wohnung.Hausnummer', 
    description: 'Hausnummer der Wohnung',
    category: 'wohnung'
  },
  { 
    id: 'wohnung.plz', 
    label: 'Wohnung.PLZ', 
    description: 'Postleitzahl der Wohnung',
    category: 'wohnung'
  },
  { 
    id: 'wohnung.ort', 
    label: 'Wohnung.Ort', 
    description: 'Ort der Wohnung',
    category: 'wohnung'
  },
  { 
    id: 'wohnung.zimmer', 
    label: 'Wohnung.Zimmer', 
    description: 'Anzahl der Zimmer',
    category: 'wohnung'
  },
  { 
    id: 'wohnung.groesse', 
    label: 'Wohnung.Größe', 
    description: 'Größe der Wohnung in m²',
    category: 'wohnung'
  },
  
  // Haus (House) variables
  { 
    id: 'haus.name', 
    label: 'Haus.Name', 
    description: 'Name des Hauses',
    category: 'haus'
  },
  { 
    id: 'haus.adresse', 
    label: 'Haus.Adresse', 
    description: 'Adresse des Hauses',
    category: 'haus'
  },
  
  // Datum (Date) variables
  { 
    id: 'datum.heute', 
    label: 'Datum.Heute', 
    description: 'Heutiges Datum (DD.MM.YYYY)',
    category: 'datum'
  },
  { 
    id: 'datum.monat', 
    label: 'Datum.Monat', 
    description: 'Aktueller Monat',
    category: 'datum'
  },
  { 
    id: 'datum.jahr', 
    label: 'Datum.Jahr', 
    description: 'Aktuelles Jahr',
    category: 'datum'
  },
  
  // Vermieter (Landlord) variables
  { 
    id: 'vermieter.name', 
    label: 'Vermieter.Name', 
    description: 'Name des Vermieters',
    category: 'vermieter'
  },
  { 
    id: 'vermieter.adresse', 
    label: 'Vermieter.Adresse', 
    description: 'Adresse des Vermieters',
    category: 'vermieter'
  },
  { 
    id: 'vermieter.telefon', 
    label: 'Vermieter.Telefon', 
    description: 'Telefonnummer des Vermieters',
    category: 'vermieter'
  },
  { 
    id: 'vermieter.email', 
    label: 'Vermieter.Email', 
    description: 'E-Mail-Adresse des Vermieters',
    category: 'vermieter'
  },
];

// Helper function to get variables by category
export const getMentionVariablesByCategory = (category?: string) => {
  if (!category) return MENTION_VARIABLES;
  return MENTION_VARIABLES.filter(variable => variable.category === category);
};

// Helper function to find variable by ID
export const getMentionVariableById = (id: string) => {
  return MENTION_VARIABLES.find(variable => variable.id === id);
};

// Helper function to get category config by ID
export const getCategoryConfig = (categoryId: string): CategoryConfig | undefined => {
  return CATEGORY_CONFIGS[categoryId];
};

// Helper function to get sorted categories
export const getSortedCategories = (): CategoryConfig[] => {
  return Object.values(CATEGORY_CONFIGS).sort((a, b) => a.order - b.order);
};