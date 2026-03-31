// Test file for the getApartmentName helper function
import { describe, it, expect } from '@jest/globals';

// Type definitions (duplicated for testing)
interface WohnungData {
  name: string;
}

// Helper function (duplicated for testing)
function getApartmentName(wohnungen: WohnungData | WohnungData[] | null): string | undefined {
  if (!wohnungen) return undefined;
  
  // Handle array format (when Supabase returns joined data as array)
  if (Array.isArray(wohnungen) && wohnungen.length > 0) {
    return wohnungen[0]?.name;
  }
  
  // Handle object format (when Supabase returns joined data as object)
  if (typeof wohnungen === 'object' && 'name' in wohnungen) {
    return wohnungen.name;
  }
  
  return undefined;
}

describe('getApartmentName', () => {
  it('should return undefined for null input', () => {
    expect(getApartmentName(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(getApartmentName(undefined as unknown as WohnungData | WohnungData[] | null)).toBeUndefined();
  });

  it('should return apartment name from object format', () => {
    const wohnung = { name: 'Apartment 1A' };
    expect(getApartmentName(wohnung)).toBe('Apartment 1A');
  });

  it('should return apartment name from array format', () => {
    const wohnungen = [{ name: 'Apartment 2B' }];
    expect(getApartmentName(wohnungen)).toBe('Apartment 2B');
  });

  it('should return first apartment name from array with multiple items', () => {
    const wohnungen = [{ name: 'First Apartment' }, { name: 'Second Apartment' }];
    expect(getApartmentName(wohnungen)).toBe('First Apartment');
  });

  it('should return undefined for empty array', () => {
    expect(getApartmentName([])).toBeUndefined();
  });

  it('should return undefined for array with null/undefined items', () => {
    expect(getApartmentName([null as unknown as WohnungData])).toBeUndefined();
    expect(getApartmentName([undefined as unknown as WohnungData])).toBeUndefined();
  });
});