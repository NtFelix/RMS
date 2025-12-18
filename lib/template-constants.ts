// Template categories for German property management
export const TEMPLATE_CATEGORIES = [
  'Mail',
  'Dokumente',
  'Sonstiges'
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

export const TEMPLATE_TYPE_CONFIGS: Record<TemplateCategory, { icon: string; label: string; description: string; color: string }> = {
  'Mail': {
    icon: 'Mail',
    label: 'E-Mail Vorlage',
    description: 'Für automatisierte E-Mails an Mieter oder Dienstleister.',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20',
  },
  'Dokumente': {
    icon: 'FileText',
    label: 'Dokument',
    description: 'Für offizielle Schreiben, Verträge und Aushänge.',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 dark:bg-orange-500/20',
  },
  'Sonstiges': {
    icon: 'MoreHorizontal',
    label: 'Sonstiges',
    description: 'Für Notizen, Protokolle und andere Textbausteine.',
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-500/20',
  },
};

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
  keywords?: string[]; // Additional search terms for better discoverability
  icon?: string; // Optional icon for visual distinction
}

export const MENTION_VARIABLES: MentionVariable[] = [
  // Mieter (Tenant) variables
  {
    id: 'mieter.name',
    label: 'Mieter.Name',
    description: 'Vollständiger Name des Mieters (Vor- und Nachname)',
    category: 'mieter',
    keywords: ['name', 'vollname', 'mieter', 'tenant', 'person'],
    icon: 'User'
  },
  {
    id: 'mieter.vorname',
    label: 'Mieter.Vorname',
    description: 'Vorname des Mieters',
    category: 'mieter',
    keywords: ['vorname', 'firstname', 'name', 'mieter'],
    icon: 'User'
  },
  {
    id: 'mieter.nachname',
    label: 'Mieter.Nachname',
    description: 'Nachname des Mieters (Familienname)',
    category: 'mieter',
    keywords: ['nachname', 'familienname', 'lastname', 'surname', 'name'],
    icon: 'User'
  },
  {
    id: 'mieter.email',
    label: 'Mieter.Email',
    description: 'E-Mail-Adresse des Mieters für Kontaktaufnahme',
    category: 'mieter',
    keywords: ['email', 'mail', 'kontakt', 'adresse', 'elektronisch'],
    icon: 'Mail'
  },
  {
    id: 'mieter.telefon',
    label: 'Mieter.Telefon',
    description: 'Telefonnummer des Mieters für direkten Kontakt',
    category: 'mieter',
    keywords: ['telefon', 'phone', 'nummer', 'kontakt', 'handy', 'mobil'],
    icon: 'Phone'
  },

  // Wohnung (Apartment) variables
  {
    id: 'wohnung.adresse',
    label: 'Wohnung.Adresse',
    description: 'Vollständige Adresse der Wohnung (Straße, Hausnummer, PLZ, Ort)',
    category: 'wohnung',
    keywords: ['adresse', 'address', 'anschrift', 'wohnung', 'standort'],
    icon: 'MapPin'
  },
  {
    id: 'wohnung.strasse',
    label: 'Wohnung.Straße',
    description: 'Straßenname der Wohnung',
    category: 'wohnung',
    keywords: ['straße', 'street', 'straßenname', 'weg', 'gasse'],
    icon: 'MapPin'
  },
  {
    id: 'wohnung.hausnummer',
    label: 'Wohnung.Hausnummer',
    description: 'Hausnummer der Wohnung (inkl. Zusätze wie a, b, etc.)',
    category: 'wohnung',
    keywords: ['hausnummer', 'nummer', 'house number', 'nr'],
    icon: 'Hash'
  },
  {
    id: 'wohnung.plz',
    label: 'Wohnung.PLZ',
    description: 'Postleitzahl der Wohnung (5-stellig)',
    category: 'wohnung',
    keywords: ['plz', 'postleitzahl', 'postal code', 'zip'],
    icon: 'MapPin'
  },
  {
    id: 'wohnung.ort',
    label: 'Wohnung.Ort',
    description: 'Stadt oder Gemeinde der Wohnung',
    category: 'wohnung',
    keywords: ['ort', 'stadt', 'city', 'gemeinde', 'location'],
    icon: 'MapPin'
  },
  {
    id: 'wohnung.zimmer',
    label: 'Wohnung.Zimmer',
    description: 'Anzahl der Zimmer in der Wohnung',
    category: 'wohnung',
    keywords: ['zimmer', 'rooms', 'anzahl', 'räume', 'zimmeranzahl'],
    icon: 'Home'
  },
  {
    id: 'wohnung.groesse',
    label: 'Wohnung.Größe',
    description: 'Wohnfläche der Wohnung in Quadratmetern (m²)',
    category: 'wohnung',
    keywords: ['größe', 'size', 'fläche', 'quadratmeter', 'm²', 'wohnfläche'],
    icon: 'Ruler'
  },

  // Haus (House) variables
  {
    id: 'haus.name',
    label: 'Haus.Name',
    description: 'Bezeichnung oder Name des Hauses/Gebäudes',
    category: 'haus',
    keywords: ['name', 'bezeichnung', 'haus', 'gebäude', 'building'],
    icon: 'Building'
  },
  {
    id: 'haus.adresse',
    label: 'Haus.Adresse',
    description: 'Vollständige Adresse des Hauses/Gebäudes',
    category: 'haus',
    keywords: ['adresse', 'address', 'haus', 'gebäude', 'standort'],
    icon: 'Building'
  },

  // Datum (Date) variables
  {
    id: 'datum.heute',
    label: 'Datum.Heute',
    description: 'Aktuelles Datum im deutschen Format (TT.MM.JJJJ)',
    category: 'datum',
    keywords: ['datum', 'heute', 'today', 'aktuell', 'current'],
    icon: 'Calendar'
  },
  {
    id: 'datum.monat',
    label: 'Datum.Monat',
    description: 'Aktueller Monat (z.B. Januar, Februar, etc.)',
    category: 'datum',
    keywords: ['monat', 'month', 'aktuell', 'current'],
    icon: 'Calendar'
  },
  {
    id: 'datum.jahr',
    label: 'Datum.Jahr',
    description: 'Aktuelles Jahr (4-stellig, z.B. 2024)',
    category: 'datum',
    keywords: ['jahr', 'year', 'aktuell', 'current'],
    icon: 'Calendar'
  },

  // Vermieter (Landlord) variables
  {
    id: 'vermieter.name',
    label: 'Vermieter.Name',
    description: 'Name des Vermieters oder der Verwaltungsgesellschaft',
    category: 'vermieter',
    keywords: ['name', 'vermieter', 'landlord', 'eigentümer', 'verwaltung'],
    icon: 'UserCheck'
  },
  {
    id: 'vermieter.adresse',
    label: 'Vermieter.Adresse',
    description: 'Geschäftsadresse des Vermieters oder der Verwaltung',
    category: 'vermieter',
    keywords: ['adresse', 'address', 'vermieter', 'geschäft', 'verwaltung'],
    icon: 'MapPin'
  },
  {
    id: 'vermieter.telefon',
    label: 'Vermieter.Telefon',
    description: 'Geschäftstelefonnummer des Vermieters',
    category: 'vermieter',
    keywords: ['telefon', 'phone', 'nummer', 'kontakt', 'geschäft'],
    icon: 'Phone'
  },
  {
    id: 'vermieter.email',
    label: 'Vermieter.Email',
    description: 'Geschäfts-E-Mail-Adresse des Vermieters',
    category: 'vermieter',
    keywords: ['email', 'mail', 'kontakt', 'geschäft', 'verwaltung'],
    icon: 'Mail'
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

// Helper function to filter mention variables by query (searches label, description, and keywords)
export const filterMentionVariables = (variables: MentionVariable[], query: string): MentionVariable[] => {
  if (!query.trim()) return variables;

  const searchTerm = query.toLowerCase().trim();

  return variables.filter(variable => {
    // Search in label
    if (variable.label.toLowerCase().includes(searchTerm)) return true;

    // Search in description
    if (variable.description.toLowerCase().includes(searchTerm)) return true;

    // Search in keywords
    if (variable.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))) return true;

    return false;
  });
};

// Helper function to group mention variables by category
export const groupMentionVariablesByCategory = (variables: MentionVariable[]): Record<string, MentionVariable[]> => {
  const grouped: Record<string, MentionVariable[]> = {};

  variables.forEach(variable => {
    const category = variable.category || 'uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(variable);
  });

  return grouped;
};

// Helper function to get all available categories from variables
export const getAvailableCategories = (variables: MentionVariable[] = MENTION_VARIABLES): string[] => {
  const categories = new Set(variables.map(v => v.category).filter(Boolean));
  return Array.from(categories) as string[];
};

// Helper function to search variables with prioritized results (exact matches first)
export const searchMentionVariables = (query: string, variables: MentionVariable[] = MENTION_VARIABLES): MentionVariable[] => {
  if (!query.trim()) return variables;

  const searchTerm = query.toLowerCase().trim();
  const exactMatches: MentionVariable[] = [];
  const partialMatches: MentionVariable[] = [];

  variables.forEach(variable => {
    const labelMatch = variable.label.toLowerCase();
    const descriptionMatch = variable.description.toLowerCase();
    const keywordMatches = variable.keywords?.map(k => k.toLowerCase()) || [];

    // Check for exact matches first
    if (labelMatch === searchTerm || keywordMatches.includes(searchTerm)) {
      exactMatches.push(variable);
    }
    // Then check for partial matches
    else if (
      labelMatch.includes(searchTerm) ||
      descriptionMatch.includes(searchTerm) ||
      keywordMatches.some(keyword => keyword.includes(searchTerm))
    ) {
      partialMatches.push(variable);
    }
  });

  // Return exact matches first, then partial matches
  return [...exactMatches, ...partialMatches];
};

// Helper function to get variable icon with fallback
export const getVariableIcon = (variable: MentionVariable): string => {
  if (variable.icon) return variable.icon;

  // Fallback to category icon
  const categoryConfig = getCategoryConfig(variable.category || '');
  return categoryConfig?.icon || 'Hash';
};

// Helper function to validate mention variable structure
export const isValidMentionVariable = (variable: any): variable is MentionVariable => {
  return (
    typeof variable === 'object' &&
    variable !== null &&
    typeof variable.id === 'string' &&
    typeof variable.label === 'string' &&
    typeof variable.description === 'string' &&
    (variable.category === undefined || typeof variable.category === 'string') &&
    (variable.keywords === undefined || Array.isArray(variable.keywords)) &&
    (variable.icon === undefined || typeof variable.icon === 'string')
  );
};