/**
 * German localization utilities for data tables
 */

// German date formatting
export const formatGermanDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return '-'
  }
  
  return dateObj.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// German date and time formatting
export const formatGermanDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return '-'
  }
  
  return dateObj.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// German number formatting
export const formatGermanNumber = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return '-'
  }
  
  return numValue.toLocaleString('de-DE')
}

// German currency formatting
export const formatGermanCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return '-'
  }
  
  return numValue.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

// German percentage formatting
export const formatGermanPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return '-'
  }
  
  return (numValue / 100).toLocaleString('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

// German decimal formatting
export const formatGermanDecimal = (value: number | string, decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return '-'
  }
  
  return numValue.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// German area formatting (square meters)
export const formatGermanArea = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return '-'
  }
  
  return `${formatGermanDecimal(numValue, 0)} m²`
}

// German price per square meter formatting
export const formatGermanPricePerSqm = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return '-'
  }
  
  return `${formatGermanDecimal(numValue, 2)} €/m²`
}

// German month names
export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

// German day names
export const GERMAN_DAYS = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'
]

// German month formatting
export const formatGermanMonth = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return '-'
  }
  
  const month = GERMAN_MONTHS[dateObj.getMonth()]
  const year = dateObj.getFullYear()
  
  return `${month} ${year}`
}

// German relative date formatting
export const formatGermanRelativeDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInMs = now.getTime() - dateObj.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'Heute'
  } else if (diffInDays === 1) {
    return 'Gestern'
  } else if (diffInDays === -1) {
    return 'Morgen'
  } else if (diffInDays > 1 && diffInDays <= 7) {
    return `vor ${diffInDays} Tagen`
  } else if (diffInDays < -1 && diffInDays >= -7) {
    return `in ${Math.abs(diffInDays)} Tagen`
  } else {
    return formatGermanDate(dateObj)
  }
}

// Data table text translations
export const DATA_TABLE_TEXTS = {
  // Search and filters
  search: 'Suchen...',
  searchPlaceholder: 'Durchsuchen...',
  filter: 'Filter',
  clearFilters: 'Filter zurücksetzen',
  noFilters: 'Keine Filter aktiv',
  
  // Pagination
  page: 'Seite',
  of: 'von',
  rowsPerPage: 'Zeilen pro Seite',
  firstPage: 'Zur ersten Seite',
  previousPage: 'Zur vorherigen Seite',
  nextPage: 'Zur nächsten Seite',
  lastPage: 'Zur letzten Seite',
  
  // Selection
  selectAll: 'Alle auswählen',
  selectRow: 'Zeile auswählen',
  selectedRows: 'Zeile(n) ausgewählt',
  
  // Sorting
  sortAscending: 'Aufsteigend sortieren',
  sortDescending: 'Absteigend sortieren',
  unsorted: 'Nicht sortiert',
  
  // Column visibility
  columns: 'Spalten',
  showColumns: 'Spalten anzeigen',
  hideColumn: 'Spalte ausblenden',
  
  // Export
  export: 'Exportieren',
  exportFormat: 'Exportformat',
  exportCsv: 'Als CSV exportieren',
  exportPdf: 'Als PDF exportieren',
  exporting: 'Exportiere...',
  exportSuccess: 'Export erfolgreich',
  exportError: 'Export fehlgeschlagen',
  
  // States
  loading: 'Lädt...',
  noData: 'Keine Daten verfügbar',
  error: 'Fehler beim Laden',
  retry: 'Erneut versuchen',
  
  // Actions
  edit: 'Bearbeiten',
  delete: 'Löschen',
  view: 'Anzeigen',
  actions: 'Aktionen',
  
  // Status
  active: 'Aktiv',
  inactive: 'Inaktiv',
  enabled: 'Aktiviert',
  disabled: 'Deaktiviert',
  
  // Common terms
  name: 'Name',
  status: 'Status',
  date: 'Datum',
  value: 'Wert',
  amount: 'Betrag',
  total: 'Gesamt',
  
  // Property management specific
  house: 'Haus',
  houses: 'Häuser',
  apartment: 'Wohnung',
  apartments: 'Wohnungen',
  tenant: 'Mieter',
  tenants: 'Mieter',
  rent: 'Miete',
  size: 'Größe',
  location: 'Ort',
  address: 'Adresse',
  moveIn: 'Einzug',
  moveOut: 'Auszug',
  occupied: 'Belegt',
  vacant: 'Frei',
  rented: 'Vermietet',
  free: 'Frei',
  
  // Financial terms
  income: 'Einnahme',
  expense: 'Ausgabe',
  balance: 'Saldo',
  transaction: 'Transaktion',
  operatingCosts: 'Betriebskosten',
  utilities: 'Nebenkosten',
  
  // Time periods
  today: 'Heute',
  yesterday: 'Gestern',
  tomorrow: 'Morgen',
  thisWeek: 'Diese Woche',
  thisMonth: 'Dieser Monat',
  thisYear: 'Dieses Jahr',
  
  // Validation messages
  required: 'Pflichtfeld',
  invalid: 'Ungültig',
  tooShort: 'Zu kurz',
  tooLong: 'Zu lang',
}

// Helper function to get localized text
export const getLocalizedText = (key: keyof typeof DATA_TABLE_TEXTS): string => {
  return DATA_TABLE_TEXTS[key] || key
}

// Format file size in German
export const formatGermanFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${formatGermanDecimal(bytes / Math.pow(k, i), 1)} ${sizes[i]}`
}

// Format duration in German
export const formatGermanDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} Sekunde${seconds !== 1 ? 'n' : ''}`
  }
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} Minute${minutes !== 1 ? 'n' : ''}`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours < 24) {
    return remainingMinutes > 0 
      ? `${hours} Stunde${hours !== 1 ? 'n' : ''} ${remainingMinutes} Minute${remainingMinutes !== 1 ? 'n' : ''}`
      : `${hours} Stunde${hours !== 1 ? 'n' : ''}`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  return remainingHours > 0
    ? `${days} Tag${days !== 1 ? 'e' : ''} ${remainingHours} Stunde${remainingHours !== 1 ? 'n' : ''}`
    : `${days} Tag${days !== 1 ? 'e' : ''}`
}

// Pluralization helper for German
export const pluralize = (count: number, singular: string, plural: string): string => {
  return count === 1 ? singular : plural
}

// German address formatting
export const formatGermanAddress = (street?: string, city?: string, postalCode?: string): string => {
  const parts = []
  
  if (street) parts.push(street)
  if (postalCode && city) {
    parts.push(`${postalCode} ${city}`)
  } else if (city) {
    parts.push(city)
  }
  
  return parts.join(', ') || '-'
}

// German phone number formatting
export const formatGermanPhoneNumber = (phone: string): string => {
  if (!phone) return '-'
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // German mobile number format
  if (digits.startsWith('49')) {
    const withoutCountry = digits.substring(2)
    if (withoutCountry.startsWith('1')) {
      // Mobile number
      return `+49 ${withoutCountry.substring(0, 3)} ${withoutCountry.substring(3, 6)} ${withoutCountry.substring(6)}`
    }
  }
  
  // Default formatting
  return phone
}