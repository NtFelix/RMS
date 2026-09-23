import { parseISO } from "date-fns";

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
  const date = parseISO(isoDate);
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
  // Normalize German dates / timestamps to YYYY-MM-DD
  const periodStart = parseISO(toIsoDateOnly(startdatum));
  const periodEnd = parseISO(toIsoDateOnly(enddatum));
  const totalPeriodDays = calculateDaysBetween(periodStart, periodEnd);
  
  // If no move-in date, return 0 occupancy
  if (!tenant.einzug) {
    return { tenantId: tenant.id, occupancyDays: 0, occupancyRatio: 0 };
  }
  
  // Parse tenant dates (German or ISO, optionally with time) to Date objects
  const tenantStart = parseISO(toIsoDateOnly(tenant.einzug));
  // Default tenant end to period end if no move-out date (still living there)
  const tenantEnd = tenant.auszug ? parseISO(toIsoDateOnly(tenant.auszug)) : periodEnd;
  
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
    const startDate = parseISO(startValidation.isoDate);
    const endDate = parseISO(endValidation.isoDate);
    
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
    
    const startDate = parseISO(startIso);
    const endDate = parseISO(endIso);

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

/**
 * Helper to parse date string (ISO or German format) as UTC Date object at 00:00:00Z
 */
export const parseAsUtc = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN);
  let isoStr = dateStr;
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('.');
    isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const cleanStr = isoStr.includes('T') ? isoStr : `${isoStr}T00:00:00Z`;
  return new Date(cleanStr);
};

/**
 * Calculate the total number of days in a period (inclusive) using UTC-safe parsing
 */
export const calculateTotalDays = (startdatum: string, enddatum: string): number => {
  const start = parseAsUtc(startdatum);
  const end = parseAsUtc(enddatum);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
};

/**
 * Get today's local date as a YYYY-MM-DD string
 */
export function getTodayISOString(): string {
  return formatLocalDateToIso(new Date());
}

/**
 * Check if a tenant is active as of a specified YYYY-MM-DD date.
 * Safely handles ISO strings with timestamps by taking the YYYY-MM-DD prefix.
 */
export function isTenantActive(
  auszug?: string | null,
  todayStr: string = getTodayISOString()
): boolean {
  if (!auszug) return true;
  const moveOutIso = toIsoDateOnly(auszug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(moveOutIso)) {
    return false;
  }
  return moveOutIso > todayStr;
}

/**
 * Normalize a German (DD.MM.YYYY) or ISO date string, optionally with a time part,
 * to its YYYY-MM-DD prefix. Invalid input is returned truncated, not validated.
 */
export function toIsoDateOnly(date: string): string {
  const trimmed = date.trim();
  return germanToIsoDate(trimmed) || trimmed.slice(0, 10);
}

/**
 * Format a local Date object as YYYY-MM-DD string without timezone conversion
 */
export function formatLocalDateToIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get the ISO date strings for the start and end of a given month (1-indexed month: 1 = Jan, 12 = Dec)
 * Avoids UTC timezone conversion bugs.
 */
export function getMonthDateRange(year: number, month: number): { startIso: string; endIso: string } {
  return {
    startIso: formatLocalDateToIso(new Date(year, month - 1, 1)),
    endIso: formatLocalDateToIso(new Date(year, month, 0))
  };
}

/**
 * Timezone the business dates (rent months, payment dates) refer to.
 * Use it on the server, where the process timezone is usually UTC.
 */
export const APP_TIME_ZONE = 'Europe/Berlin';

/**
 * Get the ISO date range of the current month, in the local timezone or the given IANA timezone
 */
export function getCurrentMonthRange(timeZone?: string): { startIso: string; endIso: string } {
  const now = new Date();
  if (!timeZone) {
    return getMonthDateRange(now.getFullYear(), now.getMonth() + 1);
  }
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(now);
  const part = (type: 'year' | 'month') => Number(parts.find(p => p.type === type)?.value);
  return getMonthDateRange(part('year'), part('month'));
}
