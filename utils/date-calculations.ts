/**
 * Utility functions for date-based calculations in the Betriebskosten system
 */

/**
 * Convert German date format (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
 */
export function germanToIsoDate(germanDate: string): string {
  if (!germanDate) return '';
  
  // Check if it's already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(germanDate)) {
    return germanDate;
  }
  
  // Parse German format DD.MM.YYYY
  const match = germanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return '';
  
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Convert ISO date format (YYYY-MM-DD) to German format (DD.MM.YYYY)
 */
export function isoToGermanDate(isoDate: string): string {
  if (!isoDate) return '';
  
  // Check if it's already in German format
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(isoDate)) {
    return isoDate;
  }
  
  // Parse ISO format YYYY-MM-DD
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  
  const [, year, month, day] = match;
  return `${parseInt(day)}.${parseInt(month)}.${year}`;
}

/**
 * Validate German date format and convert to ISO if valid
 */
export function validateGermanDate(germanDate: string): { isValid: boolean; isoDate?: string; error?: string } {
  if (!germanDate.trim()) {
    return { isValid: false, error: 'Datum ist erforderlich' };
  }
  
  const isoDate = germanToIsoDate(germanDate);
  if (!isoDate) {
    return { isValid: false, error: 'Datum muss im Format TT.MM.JJJJ sein (z.B. 01.01.2024)' };
  }
  
  // Validate the actual date
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Ungültiges Datum' };
  }
  
  // Check if the date components match (to catch invalid dates like 31.02.2024)
  const [year, month, day] = isoDate.split('-').map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return { isValid: false, error: 'Ungültiges Datum' };
  }
  
  return { isValid: true, isoDate };
}

/**
 * Calculate the number of days between two dates (inclusive of both dates)
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  // Add 1 to include both start and end dates
  return Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) + 1;
}

/**
 * Calculate tenant occupancy overlap with billing period
 */
export interface TenantOccupancy {
  tenantId: string;
  occupancyDays: number;
  occupancyRatio: number; // occupancyDays / totalPeriodDays
}

export function calculateTenantOccupancy(
  tenant: { id: string; einzug: string | null; auszug: string | null },
  startdatum: string,
  enddatum: string
): TenantOccupancy {
  // Convert German dates to ISO if needed
  const startIso = germanToIsoDate(startdatum) || startdatum;
  const endIso = germanToIsoDate(enddatum) || enddatum;
  
  const periodStart = new Date(startIso);
  const periodEnd = new Date(endIso);
  const totalPeriodDays = calculateDaysBetween(periodStart, periodEnd);
  
  // If no move-in date, return 0 occupancy
  if (!tenant.einzug) {
    return { tenantId: tenant.id, occupancyDays: 0, occupancyRatio: 0 };
  }
  
  // Parse ISO date strings (YYYY-MM-DD) to Date objects
  const tenantStart = new Date(tenant.einzug);
  // Default tenant end to period end if no move-out date (still living there)
  const tenantEnd = tenant.auszug ? new Date(tenant.auszug) : periodEnd;
  
  // Calculate overlap between tenant occupancy and billing period
  const overlapStart = new Date(Math.max(periodStart.getTime(), tenantStart.getTime()));
  const overlapEnd = new Date(Math.min(periodEnd.getTime(), tenantEnd.getTime()));
  
  const occupancyDays = overlapStart <= overlapEnd 
    ? calculateDaysBetween(overlapStart, overlapEnd)
    : 0;
  
  return {
    tenantId: tenant.id,
    occupancyDays,
    occupancyRatio: totalPeriodDays > 0 ? occupancyDays / totalPeriodDays : 0
  };
}

/**
 * Validate date range
 */
export interface DateRangeValidation {
  isValid: boolean;
  errors: {
    startdatum?: string;
    enddatum?: string;
    range?: string;
  };
  periodDays?: number;
}

export function validateDateRange(startdatum: string, enddatum: string): DateRangeValidation {
  const errors: DateRangeValidation['errors'] = {};
  
  // Validate start date (accept both German and ISO format)
  const startValidation = validateGermanDate(startdatum);
  if (!startValidation.isValid) {
    errors.startdatum = startValidation.error;
  }
  
  // Validate end date (accept both German and ISO format)
  const endValidation = validateGermanDate(enddatum);
  if (!endValidation.isValid) {
    errors.enddatum = endValidation.error;
  }
  
  // If both dates are valid, check the range
  if (startValidation.isValid && endValidation.isValid && startValidation.isoDate && endValidation.isoDate) {
    const startDate = new Date(startValidation.isoDate);
    const endDate = new Date(endValidation.isoDate);
    
    if (endDate <= startDate) {
      errors.range = 'Enddatum muss nach dem Startdatum liegen';
    } else {
      const periodDays = calculateDaysBetween(startDate, endDate);
      
      // Warn about unusual periods
      if (periodDays < 30) {
        errors.range = 'Warnung: Abrechnungszeitraum ist sehr kurz (weniger als 30 Tage)';
      } else if (periodDays > 400) {
        errors.range = 'Warnung: Abrechnungszeitraum ist sehr lang (mehr als 400 Tage)';
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        periodDays
      };
    }
  }
  
  return {
    isValid: false,
    errors
  };
}

/**
 * Get default date range for current year in German format
 */
export function getDefaultDateRange(): { startdatum: string; enddatum: string } {
  const currentYear = new Date().getFullYear();
  return {
    startdatum: `01.01.${currentYear}`,
    enddatum: `31.12.${currentYear}`
  };
}

/**
 * Format period duration for display
 */
export function formatPeriodDuration(startdatum: string, enddatum: string): string {
  try {
    // Convert to ISO format if needed
    const startIso = germanToIsoDate(startdatum) || startdatum;
    const endIso = germanToIsoDate(enddatum) || enddatum;
    
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Ungültiger Zeitraum';
    }

    const days = calculateDaysBetween(startDate, endDate);
    
    if (days === 1) {
      return '1 Tag';
    } else if (days < 30) {
      return `${days} Tage`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${days} Tage (ca. ${months} ${months === 1 ? 'Monat' : 'Monate'})`;
    } else {
      const years = Math.round(days / 365 * 10) / 10;
      return `${days} Tage (ca. ${years} ${years === 1 ? 'Jahr' : 'Jahre'})`;
    }
  } catch {
    return 'Ungültiger Zeitraum';
  }
}