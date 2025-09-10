/**
 * Predefined variable definitions for property management templates
 * Organized by category with descriptions and context requirements
 */

import type { MentionItem } from '../types/template'

/**
 * Variable categories for organizing mentions in the editor
 */
export const VARIABLE_CATEGORIES = {
  PROPERTY: 'Immobilie',
  LANDLORD: 'Vermieter', 
  TENANT: 'Mieter',
  APARTMENT: 'Wohnung',
  FINANCIAL: 'Finanzen',
  CONTRACT: 'Vertrag',
  DATE: 'Datum',
  OPERATING_COSTS: 'Betriebskosten',
  TERMINATION: 'Kündigung',
  LEGAL: 'Rechtliches',
  MAINTENANCE: 'Instandhaltung'
} as const

/**
 * Context types that variables may require
 */
export const CONTEXT_TYPES = {
  PROPERTY: 'property',
  LANDLORD: 'landlord',
  TENANT: 'tenant',
  APARTMENT: 'apartment',
  LEASE: 'lease',
  OPERATING_COSTS: 'operating_costs',
  WATER_METER: 'water_meter',
  TERMINATION: 'termination',
  MAINTENANCE: 'maintenance',
  LEGAL: 'legal'
} as const

/**
 * Validation error codes for template content
 */
export const VALIDATION_ERROR_CODES = {
  UNKNOWN_VARIABLE: 'UNKNOWN_VARIABLE',
  INVALID_CONTENT: 'INVALID_CONTENT',
  INVALID_MENTION_NODE: 'INVALID_MENTION_NODE',
  INVALID_DOCUMENT_STRUCTURE: 'INVALID_DOCUMENT_STRUCTURE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_VARIABLE_ID: 'INVALID_VARIABLE_ID'
} as const

/**
 * Validation warning codes for template content
 */
export const VALIDATION_WARNING_CODES = {
  EMPTY_CONTENT: 'EMPTY_CONTENT',
  NO_VARIABLES: 'NO_VARIABLES',
  CONTEXT_REQUIRED: 'CONTEXT_REQUIRED',
  DUPLICATE_VARIABLES: 'DUPLICATE_VARIABLES',
  MISSING_MENTION_LABEL: 'MISSING_MENTION_LABEL',
  DEPRECATED_VARIABLE: 'DEPRECATED_VARIABLE',
  VARIABLE_CONTEXT_MISMATCH: 'VARIABLE_CONTEXT_MISMATCH'
} as const

/**
 * Comprehensive predefined variables for property management
 */
export const PREDEFINED_VARIABLES: MentionItem[] = [
  // Property/Building variables
  {
    id: 'property_name',
    label: 'Objektname',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Name oder Bezeichnung der Immobilie/des Hauses',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_address',
    label: 'Objektadresse',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Vollständige Adresse der Immobilie (Straße, PLZ, Ort)',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_street',
    label: 'Straße',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Straße und Hausnummer der Immobilie',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_city',
    label: 'Stadt',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Stadt/Ort der Immobilie',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_postal_code',
    label: 'Postleitzahl',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Postleitzahl der Immobilie',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_size',
    label: 'Objektgröße',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Gesamtgröße der Immobilie in Quadratmetern',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_type',
    label: 'Objekttyp',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Art der Immobilie (Einfamilienhaus, Mehrfamilienhaus, Gewerbe, etc.)',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_year_built',
    label: 'Baujahr',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Jahr der Errichtung der Immobilie',
    context: [CONTEXT_TYPES.PROPERTY]
  },
  {
    id: 'property_land_registry',
    label: 'Grundbuch',
    category: VARIABLE_CATEGORIES.PROPERTY,
    description: 'Grundbuchnummer oder -bezeichnung',
    context: [CONTEXT_TYPES.PROPERTY]
  },

  // Landlord/Owner variables
  {
    id: 'landlord_name',
    label: 'Vermieter Name',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Vollständiger Name des Vermieters (Vor- und Nachname)',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_first_name',
    label: 'Vermieter Vorname',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Vorname des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_last_name',
    label: 'Vermieter Nachname',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Nachname des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_title',
    label: 'Vermieter Titel',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Akademischer Titel oder Anrede des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_company',
    label: 'Vermieter Firma',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Firmenname, falls Vermieter eine juristische Person ist',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_address',
    label: 'Vermieter Adresse',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Vollständige Postanschrift des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_phone',
    label: 'Vermieter Telefon',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Telefonnummer des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_mobile',
    label: 'Vermieter Mobil',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Mobiltelefonnummer des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_email',
    label: 'Vermieter E-Mail',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'E-Mail-Adresse des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },
  {
    id: 'landlord_tax_id',
    label: 'Vermieter Steuernummer',
    category: VARIABLE_CATEGORIES.LANDLORD,
    description: 'Steuernummer des Vermieters',
    context: [CONTEXT_TYPES.LANDLORD]
  },

  // Tenant variables
  {
    id: 'tenant_name',
    label: 'Mieter Name',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Vollständiger Name des Mieters (Vor- und Nachname)',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_first_name',
    label: 'Mieter Vorname',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Vorname des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_last_name',
    label: 'Mieter Nachname',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Nachname des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_title',
    label: 'Mieter Titel',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Akademischer Titel oder Anrede des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_address',
    label: 'Mieter Adresse',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Aktuelle Postanschrift des Mieters (vor Einzug)',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_phone',
    label: 'Mieter Telefon',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Telefonnummer des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_mobile',
    label: 'Mieter Mobil',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Mobiltelefonnummer des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_email',
    label: 'Mieter E-Mail',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'E-Mail-Adresse des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_birth_date',
    label: 'Geburtsdatum Mieter',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Geburtsdatum des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_id_number',
    label: 'Personalausweis Mieter',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Personalausweisnummer des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_move_in_date',
    label: 'Einzugsdatum',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Datum des Einzugs des Mieters',
    context: [CONTEXT_TYPES.TENANT, CONTEXT_TYPES.LEASE]
  },
  {
    id: 'tenant_move_out_date',
    label: 'Auszugsdatum',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Datum des Auszugs des Mieters',
    context: [CONTEXT_TYPES.TENANT, CONTEXT_TYPES.LEASE]
  },
  {
    id: 'tenant_occupation',
    label: 'Beruf Mieter',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Beruf oder Tätigkeit des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },
  {
    id: 'tenant_employer',
    label: 'Arbeitgeber Mieter',
    category: VARIABLE_CATEGORIES.TENANT,
    description: 'Arbeitgeber des Mieters',
    context: [CONTEXT_TYPES.TENANT]
  },

  // Apartment/Unit variables
  {
    id: 'apartment_name',
    label: 'Wohnungsbezeichnung',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Bezeichnung, Nummer oder Name der Wohnung',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_size',
    label: 'Wohnungsgröße',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Wohnfläche der Wohnung in Quadratmetern',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_rooms',
    label: 'Anzahl Zimmer',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Anzahl der Zimmer in der Wohnung',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_bedrooms',
    label: 'Anzahl Schlafzimmer',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Anzahl der Schlafzimmer in der Wohnung',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_bathrooms',
    label: 'Anzahl Badezimmer',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Anzahl der Badezimmer in der Wohnung',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_floor',
    label: 'Stockwerk',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Stockwerk der Wohnung (z.B. EG, 1. OG)',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_balcony',
    label: 'Balkon/Terrasse',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Vorhandensein und Größe von Balkon oder Terrasse',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_parking',
    label: 'Stellplatz',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Informationen zu Stellplatz oder Garage',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_cellar',
    label: 'Keller',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Informationen zu Kellerraum',
    context: [CONTEXT_TYPES.APARTMENT]
  },
  {
    id: 'apartment_garden',
    label: 'Garten',
    category: VARIABLE_CATEGORIES.APARTMENT,
    description: 'Informationen zu Gartenmitbenutzung',
    context: [CONTEXT_TYPES.APARTMENT]
  },

  // Financial variables
  {
    id: 'apartment_rent',
    label: 'Kaltmiete',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Nettokaltmiete der Wohnung pro Monat',
    context: [CONTEXT_TYPES.APARTMENT, CONTEXT_TYPES.LEASE]
  },
  {
    id: 'apartment_additional_costs',
    label: 'Nebenkosten',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Nebenkosten-Vorauszahlung pro Monat',
    context: [CONTEXT_TYPES.APARTMENT, CONTEXT_TYPES.LEASE]
  },
  {
    id: 'apartment_heating_costs',
    label: 'Heizkosten',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Heizkosten-Vorauszahlung pro Monat',
    context: [CONTEXT_TYPES.APARTMENT, CONTEXT_TYPES.LEASE]
  },
  {
    id: 'total_rent',
    label: 'Gesamtmiete',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Gesamtmiete (Kalt + Nebenkosten + Heizkosten)',
    context: [CONTEXT_TYPES.APARTMENT, CONTEXT_TYPES.LEASE]
  },
  {
    id: 'deposit_amount',
    label: 'Kaution',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Höhe der Mietkaution',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'monthly_payment',
    label: 'Monatliche Zahlung',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Gesamte monatliche Zahlung des Mieters',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'rent_increase_amount',
    label: 'Mieterhöhung',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Betrag der Mieterhöhung',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'rent_increase_percentage',
    label: 'Mieterhöhung Prozent',
    category: VARIABLE_CATEGORIES.FINANCIAL,
    description: 'Prozentuale Mieterhöhung',
    context: [CONTEXT_TYPES.LEASE]
  },

  // Contract/Lease variables
  {
    id: 'contract_start_date',
    label: 'Vertragsbeginn',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Startdatum des Mietvertrags',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'contract_end_date',
    label: 'Vertragsende',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Enddatum des Mietvertrags (falls befristet)',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'contract_type',
    label: 'Vertragsart',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Art des Mietvertrags (unbefristet, befristet, möbliert)',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'contract_duration',
    label: 'Vertragslaufzeit',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Laufzeit des Mietvertrags in Monaten',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'notice_period',
    label: 'Kündigungsfrist',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Kündigungsfrist in Monaten',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'contract_number',
    label: 'Vertragsnummer',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Eindeutige Nummer des Mietvertrags',
    context: [CONTEXT_TYPES.LEASE]
  },
  {
    id: 'rent_due_date',
    label: 'Mietzahlungstermin',
    category: VARIABLE_CATEGORIES.CONTRACT,
    description: 'Tag des Monats, an dem die Miete fällig ist',
    context: [CONTEXT_TYPES.LEASE]
  },

  // Date variables (no context required - automatically generated)
  {
    id: 'current_date',
    label: 'Aktuelles Datum',
    category: VARIABLE_CATEGORIES.DATE,
    description: 'Heutiges Datum (automatisch eingefügt)'
  },
  {
    id: 'current_month',
    label: 'Aktueller Monat',
    category: VARIABLE_CATEGORIES.DATE,
    description: 'Aktueller Monat als Text (automatisch eingefügt)'
  },
  {
    id: 'current_year',
    label: 'Aktuelles Jahr',
    category: VARIABLE_CATEGORIES.DATE,
    description: 'Aktuelles Jahr (automatisch eingefügt)'
  },
  {
    id: 'document_creation_date',
    label: 'Dokumenterstellung',
    category: VARIABLE_CATEGORIES.DATE,
    description: 'Datum der Dokumenterstellung'
  },

  // Operating costs variables
  {
    id: 'operating_costs_year',
    label: 'Betriebskostenjahr',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Jahr der Betriebskostenabrechnung',
    context: [CONTEXT_TYPES.OPERATING_COSTS]
  },
  {
    id: 'operating_costs_period',
    label: 'Abrechnungszeitraum',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Zeitraum der Betriebskostenabrechnung',
    context: [CONTEXT_TYPES.OPERATING_COSTS]
  },
  {
    id: 'water_consumption',
    label: 'Wasserverbrauch',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Wasserverbrauch in Kubikmetern',
    context: [CONTEXT_TYPES.OPERATING_COSTS, CONTEXT_TYPES.WATER_METER]
  },
  {
    id: 'heating_consumption',
    label: 'Heizverbrauch',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Heizverbrauch in kWh oder Kubikmetern',
    context: [CONTEXT_TYPES.OPERATING_COSTS]
  },
  {
    id: 'electricity_consumption',
    label: 'Stromverbrauch',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Stromverbrauch in kWh',
    context: [CONTEXT_TYPES.OPERATING_COSTS]
  },
  {
    id: 'operating_costs_total',
    label: 'Betriebskosten Gesamt',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Gesamte Betriebskosten für den Abrechnungszeitraum',
    context: [CONTEXT_TYPES.OPERATING_COSTS]
  },
  {
    id: 'operating_costs_balance',
    label: 'Betriebskosten Saldo',
    category: VARIABLE_CATEGORIES.OPERATING_COSTS,
    description: 'Nachzahlung oder Guthaben aus der Betriebskostenabrechnung',
    context: [CONTEXT_TYPES.OPERATING_COSTS]
  },

  // Termination variables
  {
    id: 'termination_date',
    label: 'Kündigungsdatum',
    category: VARIABLE_CATEGORIES.TERMINATION,
    description: 'Datum der Kündigung',
    context: [CONTEXT_TYPES.TERMINATION]
  },
  {
    id: 'termination_reason',
    label: 'Kündigungsgrund',
    category: VARIABLE_CATEGORIES.TERMINATION,
    description: 'Grund für die Kündigung',
    context: [CONTEXT_TYPES.TERMINATION]
  },
  {
    id: 'move_out_deadline',
    label: 'Auszugsfrist',
    category: VARIABLE_CATEGORIES.TERMINATION,
    description: 'Frist bis zum Auszug',
    context: [CONTEXT_TYPES.TERMINATION]
  },
  {
    id: 'termination_type',
    label: 'Kündigungsart',
    category: VARIABLE_CATEGORIES.TERMINATION,
    description: 'Art der Kündigung (ordentlich, außerordentlich, fristlos)',
    context: [CONTEXT_TYPES.TERMINATION]
  },
  {
    id: 'notice_period_end',
    label: 'Kündigungsfrist Ende',
    category: VARIABLE_CATEGORIES.TERMINATION,
    description: 'Ende der Kündigungsfrist',
    context: [CONTEXT_TYPES.TERMINATION]
  },

  // Legal/Administrative variables
  {
    id: 'court_name',
    label: 'Zuständiges Gericht',
    category: VARIABLE_CATEGORIES.LEGAL,
    description: 'Name des zuständigen Gerichts',
    context: [CONTEXT_TYPES.LEGAL]
  },
  {
    id: 'legal_reference',
    label: 'Rechtsgrundlage',
    category: VARIABLE_CATEGORIES.LEGAL,
    description: 'Relevante Rechtsgrundlage oder Paragraf',
    context: [CONTEXT_TYPES.LEGAL]
  },
  {
    id: 'witness_name',
    label: 'Zeuge Name',
    category: VARIABLE_CATEGORIES.LEGAL,
    description: 'Name eines Zeugen',
    context: [CONTEXT_TYPES.LEGAL]
  },

  // Maintenance variables
  {
    id: 'maintenance_date',
    label: 'Wartungsdatum',
    category: VARIABLE_CATEGORIES.MAINTENANCE,
    description: 'Datum der Wartung oder Reparatur',
    context: [CONTEXT_TYPES.MAINTENANCE]
  },
  {
    id: 'maintenance_description',
    label: 'Wartungsbeschreibung',
    category: VARIABLE_CATEGORIES.MAINTENANCE,
    description: 'Beschreibung der durchgeführten Wartung',
    context: [CONTEXT_TYPES.MAINTENANCE]
  },
  {
    id: 'maintenance_cost',
    label: 'Wartungskosten',
    category: VARIABLE_CATEGORIES.MAINTENANCE,
    description: 'Kosten der Wartung oder Reparatur',
    context: [CONTEXT_TYPES.MAINTENANCE]
  },
  {
    id: 'contractor_name',
    label: 'Handwerker Name',
    category: VARIABLE_CATEGORIES.MAINTENANCE,
    description: 'Name des beauftragten Handwerkers oder Unternehmens',
    context: [CONTEXT_TYPES.MAINTENANCE]
  },
  {
    id: 'contractor_phone',
    label: 'Handwerker Telefon',
    category: VARIABLE_CATEGORIES.MAINTENANCE,
    description: 'Telefonnummer des Handwerkers',
    context: [CONTEXT_TYPES.MAINTENANCE]
  }
]

/**
 * Get category color for UI display
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    [VARIABLE_CATEGORIES.PROPERTY]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [VARIABLE_CATEGORIES.LANDLORD]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [VARIABLE_CATEGORIES.TENANT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    [VARIABLE_CATEGORIES.APARTMENT]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    [VARIABLE_CATEGORIES.FINANCIAL]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [VARIABLE_CATEGORIES.CONTRACT]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [VARIABLE_CATEGORIES.DATE]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    [VARIABLE_CATEGORIES.OPERATING_COSTS]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    [VARIABLE_CATEGORIES.TERMINATION]: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    [VARIABLE_CATEGORIES.LEGAL]: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    [VARIABLE_CATEGORIES.MAINTENANCE]: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
  }
  
  return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

/**
 * Get category icon for UI display
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    [VARIABLE_CATEGORIES.PROPERTY]: '🏢',
    [VARIABLE_CATEGORIES.LANDLORD]: '👤',
    [VARIABLE_CATEGORIES.TENANT]: '🏠',
    [VARIABLE_CATEGORIES.APARTMENT]: '🚪',
    [VARIABLE_CATEGORIES.FINANCIAL]: '💰',
    [VARIABLE_CATEGORIES.CONTRACT]: '📄',
    [VARIABLE_CATEGORIES.DATE]: '📅',
    [VARIABLE_CATEGORIES.OPERATING_COSTS]: '🧾',
    [VARIABLE_CATEGORIES.TERMINATION]: '❌',
    [VARIABLE_CATEGORIES.LEGAL]: '⚖️',
    [VARIABLE_CATEGORIES.MAINTENANCE]: '🔧'
  }
  
  return icons[category] || '📝'
}

/**
 * Validate variable ID format
 */
export function isValidVariableId(id: string): boolean {
  // Variable IDs should be lowercase, alphanumeric with underscores
  // Must start with a letter, can contain numbers and underscores
  return /^[a-z][a-z0-9_]*[a-z0-9]$/.test(id) || /^[a-z]$/.test(id)
}

/**
 * Get variables by category
 */
export function getVariablesByCategory(): Record<string, MentionItem[]> {
  const categorized: Record<string, MentionItem[]> = {}

  PREDEFINED_VARIABLES.forEach(variable => {
    if (!categorized[variable.category]) {
      categorized[variable.category] = []
    }
    categorized[variable.category].push(variable)
  })

  // Sort variables within each category by label
  Object.keys(categorized).forEach(category => {
    categorized[category].sort((a, b) => a.label.localeCompare(b.label))
  })

  return categorized
}

/**
 * Get variable by ID
 */
export function getVariableById(id: string): MentionItem | undefined {
  return PREDEFINED_VARIABLES.find(variable => variable.id === id)
}

/**
 * Search variables by query
 */
export function searchVariables(query: string): MentionItem[] {
  if (!query.trim()) return PREDEFINED_VARIABLES

  const lowercaseQuery = query.toLowerCase()

  return PREDEFINED_VARIABLES.filter(variable => 
    variable.label.toLowerCase().includes(lowercaseQuery) ||
    variable.id.toLowerCase().includes(lowercaseQuery) ||
    variable.category.toLowerCase().includes(lowercaseQuery) ||
    (variable.description && variable.description.toLowerCase().includes(lowercaseQuery))
  )
}

/**
 * Get context requirements for variables
 */
export function getContextRequirements(variableIds: string[]): string[] {
  const requirements = new Set<string>()

  variableIds.forEach(id => {
    const variable = getVariableById(id)
    if (variable?.context) {
      variable.context.forEach(req => requirements.add(req))
    }
  })

  return Array.from(requirements).sort()
}

/**
 * Filter variables by context type
 */
export function getVariablesForContext(contextType: string): MentionItem[] {
  return PREDEFINED_VARIABLES.filter(variable => 
    variable.context && variable.context.includes(contextType)
  )
}

/**
 * Get variables that don't require context (e.g., date variables)
 */
export function getContextFreeVariables(): MentionItem[] {
  return PREDEFINED_VARIABLES.filter(variable => !variable.context || variable.context.length === 0)
}

/**
 * Group variables by category with counts
 */
export function getCategorySummary(): Array<{ category: string; count: number; icon: string; color: string }> {
  const categorized = getVariablesByCategory()
  
  return Object.entries(categorized).map(([category, variables]) => ({
    category,
    count: variables.length,
    icon: getCategoryIcon(category),
    color: getCategoryColor(category)
  })).sort((a, b) => a.category.localeCompare(b.category))
}