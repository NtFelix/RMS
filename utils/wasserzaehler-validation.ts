/**
 * Client-side validation utilities for Wasserzähler data
 * Implements validation before submission to optimize performance
 */

import { MeterReadingFormData, MeterReadingFormEntry } from '@/lib/data-fetching';

export interface ValidationError {
  field: string;
  message: string;
  entryIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validEntries: MeterReadingFormEntry[];
}

/**
 * Validates a single Meter form entry
 */
export function validateMeterReadingEntry(
  entry: MeterReadingFormEntry,
  index: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate mieter_id
  if (!entry.mieter_id || entry.mieter_id.trim() === '') {
    errors.push({
      field: 'mieter_id',
      message: 'Mieter ID ist erforderlich',
      entryIndex: index
    });
  }

  // Validate zaehlerstand
  const zaehlerstandValue = String(entry.zaehlerstand).trim();

  if (!zaehlerstandValue || zaehlerstandValue === '') {
    errors.push({
      field: 'zaehlerstand',
      message: 'Zählerstand ist erforderlich',
      entryIndex: index
    });
  } else {
    const numericValue = parseFloat(zaehlerstandValue);
    if (isNaN(numericValue) || numericValue < 0) {
      errors.push({
        field: 'zaehlerstand',
        message: 'Zählerstand muss eine positive Zahl sein',
        entryIndex: index
      });
    }
  }

  // Validate verbrauch (optional but must be numeric if provided)
  let verbrauchValue = '';
  if (entry.verbrauch !== undefined && entry.verbrauch !== null) {
    verbrauchValue = String(entry.verbrauch).trim();
  }

  if (verbrauchValue && verbrauchValue !== '') {
    const numericValue = parseFloat(verbrauchValue);
    if (isNaN(numericValue) || numericValue < 0) {
      errors.push({
        field: 'verbrauch',
        message: 'Verbrauch muss eine positive Zahl sein',
        entryIndex: index
      });
    }
  }

  // Validate ablese_datum (optional but must be valid date if provided)
  if (entry.ablese_datum && entry.ablese_datum.trim() !== '') {
    const date = new Date(entry.ablese_datum);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'ablese_datum',
        message: 'Ungültiges Datumsformat',
        entryIndex: index
      });
    } else {
      // Check if date is not in the future
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      if (date > today) {
        errors.push({
          field: 'ablese_datum',
          message: 'Ablesedatum darf nicht in der Zukunft liegen',
          entryIndex: index
        });
      }
    }
  }

  return errors;
}

/**
 * Validates the complete Meter form data
 */
export function validateMeterReadingFormData(formData: MeterReadingFormData): ValidationResult {
  const errors: ValidationError[] = [];
  const validEntries: MeterReadingFormEntry[] = [];

  // Validate nebenkosten_id
  if (!formData.nebenkosten_id || formData.nebenkosten_id.trim() === '') {
    errors.push({
      field: 'nebenkosten_id',
      message: 'Nebenkosten ID ist erforderlich'
    });
  }

  // Validate entries
  if (!formData.entries || formData.entries.length === 0) {
    // Empty entries is valid - it means delete all existing entries
    return {
      isValid: errors.length === 0,
      errors,
      validEntries: []
    };
  }

  // Validate each entry
  formData.entries.forEach((entry, index) => {
    const entryErrors = validateMeterReadingEntry(entry, index);
    errors.push(...entryErrors);

    // If entry has no errors, add to valid entries
    if (entryErrors.length === 0) {
      validEntries.push(entry);
    }
  });

  // Check for duplicate mieter_ids
  const mieterIds = validEntries.map(entry => entry.mieter_id);
  const duplicateIds = mieterIds.filter((id, index) => mieterIds.indexOf(id) !== index);

  if (duplicateIds.length > 0) {
    duplicateIds.forEach(id => {
      errors.push({
        field: 'mieter_id',
        message: `Doppelte Einträge für Mieter ${id} gefunden`
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    validEntries
  };
}

/**
 * Formats validation errors for display to user
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  const errorMessages = errors.map(error => {
    const prefix = error.entryIndex !== undefined
      ? `Eintrag ${error.entryIndex + 1}: `
      : '';
    return `${prefix}${error.message}`;
  });

  return errorMessages.join('\n');
}

/**
 * Prepares validated data for database submission
 */
export function prepareMeterReadingsForSubmission(
  validEntries: MeterReadingFormEntry[]
): any[] {
  return validEntries.map(entry => ({
    mieter_id: entry.mieter_id,
    ablese_datum: entry.ablese_datum || null,
    zaehlerstand: typeof entry.zaehlerstand === 'string'
      ? parseFloat(entry.zaehlerstand)
      : entry.zaehlerstand,
    verbrauch: entry.verbrauch
      ? (typeof entry.verbrauch === 'string' ? parseFloat(entry.verbrauch) : entry.verbrauch)
      : 0
  }));
}