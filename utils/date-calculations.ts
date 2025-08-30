/**
 * Utility functions for date-based calculations in the Betriebskosten system
 */

/**
 * Calculate the number of days between two dates (inclusive)
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to make it inclusive
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
  const periodStart = new Date(startdatum);
  const periodEnd = new Date(enddatum);
  const totalPeriodDays = calculateDaysBetween(periodStart, periodEnd);
  
  // Default tenant start to period start if no move-in date
  const tenantStart = tenant.einzug ? new Date(tenant.einzug) : periodStart;
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
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!startdatum || !dateRegex.test(startdatum)) {
    errors.startdatum = 'Startdatum muss im Format YYYY-MM-DD sein';
  }
  
  if (!enddatum || !dateRegex.test(enddatum)) {
    errors.enddatum = 'Enddatum muss im Format YYYY-MM-DD sein';
  }
  
  // If format is valid, check if dates are valid
  if (!errors.startdatum && !errors.enddatum) {
    const startDate = new Date(startdatum);
    const endDate = new Date(enddatum);
    
    if (isNaN(startDate.getTime())) {
      errors.startdatum = 'Ungültiges Startdatum';
    }
    
    if (isNaN(endDate.getTime())) {
      errors.enddatum = 'Ungültiges Enddatum';
    }
    
    // Check date range
    if (!errors.startdatum && !errors.enddatum) {
      if (endDate <= startDate) {
        errors.range = 'Enddatum muss nach dem Startdatum liegen';
      }
      
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
 * Get default date range for current year
 */
export function getDefaultDateRange(): { startdatum: string; enddatum: string } {
  const currentYear = new Date().getFullYear();
  return {
    startdatum: `${currentYear}-01-01`,
    enddatum: `${currentYear}-12-31`
  };
}

/**
 * Format period duration for display
 */
export function formatPeriodDuration(startdatum: string, enddatum: string): string {
  try {
    const startDate = new Date(startdatum);
    const endDate = new Date(enddatum);
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