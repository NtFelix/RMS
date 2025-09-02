/**
 * Integration tests for performance optimization database functions
 * These tests verify that the new database functions are properly structured
 * and have the correct TypeScript types.
 */

import { 
  OptimizedNebenkosten, 
  WasserzaehlerModalData, 
  AbrechnungModalData,
  isOptimizedNebenkosten,
  isWasserzaehlerModalData,
  isAbrechnungModalData
} from '@/types/optimized-betriebskosten';
import { createClient } from '@/utils/supabase/client';

describe('Database Functions Type Definitions', () => {
  describe('OptimizedNebenkosten Type', () => {
    it('should have all required fields for optimized nebenkosten data', () => {
      const mockData: OptimizedNebenkosten = {
        id: 'test-id',
        startdatum: '2024-01-01',
        enddatum: '2024-12-31',
        nebenkostenart: ['Wasser', 'Heizung'],
        betrag: [100, 200],
        berechnungsart: ['Verbrauch', 'Fläche'],
        wasserkosten: 150,
        wasserverbrauch: 1000,
        haeuser_id: 'house-id',
        user_id: 'user-id',
        haus_name: 'Test House',
        gesamt_flaeche: 100,
        anzahl_wohnungen: 5,
        anzahl_mieter: 8
      };

      // Verify all fields are properly typed
      expect(typeof mockData.id).toBe('string');
      expect(typeof mockData.haus_name).toBe('string');
      expect(typeof mockData.gesamt_flaeche).toBe('number');
      expect(typeof mockData.anzahl_wohnungen).toBe('number');
      expect(typeof mockData.anzahl_mieter).toBe('number');
      expect(Array.isArray(mockData.nebenkostenart)).toBe(true);
      expect(Array.isArray(mockData.betrag)).toBe(true);
    });

    it('should pass type guard validation', () => {
      const mockData: OptimizedNebenkosten = {
        id: 'test-id',
        startdatum: '2024-01-01',
        enddatum: '2024-12-31',
        nebenkostenart: ['Wasser'],
        betrag: [100],
        berechnungsart: ['Verbrauch'],
        wasserkosten: 150,
        wasserverbrauch: 1000,
        haeuser_id: 'house-id',
        user_id: 'user-id',
        haus_name: 'Test House',
        gesamt_flaeche: 100,
        anzahl_wohnungen: 5,
        anzahl_mieter: 8
      };

      expect(isOptimizedNebenkosten(mockData)).toBe(true);
      expect(isOptimizedNebenkosten({})).toBe(false);
      expect(isOptimizedNebenkosten(null)).toBe(false);
    });
  });

  describe('WasserzaehlerModalData Type', () => {
    it('should have all required fields for wasserzaehler modal data', () => {
      const mockData: WasserzaehlerModalData = {
        mieter_id: 'tenant-id',
        mieter_name: 'Test Tenant',
        wohnung_name: 'Apartment 1',
        wohnung_groesse: 75,
        current_reading: {
          ablese_datum: '2024-12-31',
          zaehlerstand: 1500,
          verbrauch: 100
        },
        previous_reading: {
          ablese_datum: '2023-12-31',
          zaehlerstand: 1400,
          verbrauch: 90
        }
      };

      expect(typeof mockData.mieter_id).toBe('string');
      expect(typeof mockData.mieter_name).toBe('string');
      expect(typeof mockData.wohnung_name).toBe('string');
      expect(typeof mockData.wohnung_groesse).toBe('number');
      expect(mockData.current_reading).toHaveProperty('ablese_datum');
      expect(mockData.current_reading).toHaveProperty('zaehlerstand');
      expect(mockData.current_reading).toHaveProperty('verbrauch');
      expect(mockData.previous_reading).toHaveProperty('ablese_datum');
    });

    it('should allow null values for optional readings', () => {
      const mockData: WasserzaehlerModalData = {
        mieter_id: 'tenant-id',
        mieter_name: 'Test Tenant',
        wohnung_name: 'Apartment 1',
        wohnung_groesse: 75,
        current_reading: null,
        previous_reading: null
      };

      expect(mockData.current_reading).toBeNull();
      expect(mockData.previous_reading).toBeNull();
    });

    it('should pass type guard validation', () => {
      const mockData: WasserzaehlerModalData = {
        mieter_id: 'tenant-id',
        mieter_name: 'Test Tenant',
        wohnung_name: 'Apartment 1',
        wohnung_groesse: 75,
        current_reading: null,
        previous_reading: null
      };

      expect(isWasserzaehlerModalData(mockData)).toBe(true);
      expect(isWasserzaehlerModalData({})).toBe(false);
      expect(isWasserzaehlerModalData(null)).toBe(false);
    });
  });

  describe('AbrechnungModalData Type', () => {
    it('should have all required fields for abrechnung modal data', () => {
      const mockData: AbrechnungModalData = {
        nebenkosten_data: { id: 'test', name: 'Test Nebenkosten' },
        tenants: [{ id: 'tenant1', name: 'Tenant 1' }],
        rechnungen: [{ id: 'rechnung1', betrag: 100 }],
        wasserzaehler_readings: [{ id: 'reading1', verbrauch: 50 }]
      };

      expect(typeof mockData.nebenkosten_data).toBe('object');
      expect(Array.isArray(mockData.tenants)).toBe(true);
      expect(Array.isArray(mockData.rechnungen)).toBe(true);
      expect(Array.isArray(mockData.wasserzaehler_readings)).toBe(true);
    });

    it('should pass type guard validation', () => {
      const mockData: AbrechnungModalData = {
        nebenkosten_data: { id: 'test', name: 'Test Nebenkosten' } as any,
        tenants: [],
        rechnungen: [],
        wasserzaehler_readings: []
      };

      expect(isAbrechnungModalData(mockData)).toBe(true);
      expect(isAbrechnungModalData({})).toBe(false);
      expect(isAbrechnungModalData(null)).toBe(false);
    });
  });

  describe('Database Function SQL Structure', () => {
    it('should have proper SQL function definitions', () => {
      // Test that the migration file exists and contains the expected functions
      const fs = require('fs');
      const path = require('path');
      
      const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250202000000_add_performance_optimization_functions.sql');
      
      expect(fs.existsSync(migrationPath)).toBe(true);
      
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      
      // Verify all three functions are defined
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION get_nebenkosten_with_metrics');
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION get_wasserzaehler_modal_data');
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION get_abrechnung_modal_data');
      
      // Verify proper permissions are granted
      expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION');
      
      // Verify functions have proper security
      expect(migrationContent).toContain('SECURITY DEFINER');
    });
  });
});

// Helper function to test with real data (would need to be run manually with valid IDs)
export async function testWithRealData(
  userId: string,
  nebenkostenId?: string
) {
  const supabase = createClient();
  
  console.log('Testing get_nebenkosten_with_metrics...');
  const { data: nebenkostenData, error: nebenkostenError } = await supabase.rpc(
    'get_nebenkosten_with_metrics',
    { user_id: userId }
  );
  
  console.log('Nebenkosten result:', {
    error: nebenkostenError,
    dataCount: nebenkostenData?.length || 0,
    sampleData: nebenkostenData?.[0]
  });

  if (nebenkostenId) {
    console.log('Testing get_wasserzaehler_modal_data...');
    const { data: wasserzaehlerData, error: wasserzaehlerError } = await supabase.rpc(
      'get_wasserzaehler_modal_data',
      { nebenkosten_id: nebenkostenId, user_id: userId }
    );
    
    console.log('Wasserzaehler result:', {
      error: wasserzaehlerError,
      dataCount: wasserzaehlerData?.length || 0,
      sampleData: wasserzaehlerData?.[0]
    });

    console.log('Testing get_abrechnung_modal_data...');
    const { data: abrechnungData, error: abrechnungError } = await supabase.rpc(
      'get_abrechnung_modal_data',
      { nebenkosten_id: nebenkostenId, user_id: userId }
    );
    
    console.log('Abrechnung result:', {
      error: abrechnungError,
      data: abrechnungData
    });
  }
}