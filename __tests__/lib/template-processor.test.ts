/**
 * Template Processor Tests
 * Comprehensive tests for template processing with various contexts
 */

import { TemplateProcessor } from '@/lib/template-system/template-processor';
import type { TemplateContext } from '@/types/template-system';
import type { Tenant } from '@/types/Tenant';
import type { Apartment } from '@/components/apartment-table';
import type { House } from '@/components/house-table';

describe('TemplateProcessor', () => {
  let processor: TemplateProcessor;
  let mockContext: TemplateContext;
  
  beforeEach(() => {
    processor = new TemplateProcessor();
    
    // Setup mock context data
    const mockTenant: Tenant = {
      id: 'tenant-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49 123 456789',
      einzug: '2023-01-15',
      auszug: '2024-12-31',
      wohnung_id: 'apartment-1',
      nebenkosten: [
        { id: '1', amount: '150.00', date: '2024-01-01' },
        { id: '2', amount: '75.50', date: '2024-02-01' }
      ]
    };
    
    const mockApartment: Apartment = {
      id: 'apartment-1',
      name: 'Wohnung 2A',
      groesse: 85,
      miete: 1200,
      haus_id: 'house-1',
      status: 'vermietet',
      Haeuser: { name: 'Musterstraße 123, Berlin' },
      tenant: {
        id: 'tenant-1',
        name: 'Max Mustermann',
        einzug: '2023-01-15'
      }
    };
    
    const mockHouse: House = {
      id: 'house-1',
      name: 'Musterhaus',
      strasse: 'Musterstraße 123',
      ort: 'Berlin',
      size: '450',
      rent: '4800'
    };
    
    const mockLandlord = {
      id: 'user-1',
      name: 'Anna Vermieter',
      email: 'anna@vermieter.de'
    };
    
    mockContext = {
      mieter: mockTenant,
      wohnung: mockApartment,
      haus: mockHouse,
      vermieter: mockLandlord,
      datum: new Date('2024-02-09T10:00:00Z')
    };
  });
  
  describe('processTemplate', () => {
    it('should process template with all placeholder types', () => {
      const template = `
Sehr geehrte/r @mieter.name,

hiermit bestätigen wir Ihren Einzug am @mieter.einzug in die @wohnung.name 
(@wohnung.groesse) im @haus.name, @haus.strasse, @haus.ort.

Die monatliche Miete beträgt @wohnung.miete.
Ihre Nebenkostenvorauszahlung beläuft sich auf @mieter.nebenkosten.

Datum: @datum

Mit freundlichen Grüßen
@vermieter.name
@vermieter.email
      `.trim();
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.unresolvedPlaceholders).toHaveLength(0);
      expect(result.processedContent).toContain('Max Mustermann');
      expect(result.processedContent).toContain('15.01.2023');
      expect(result.processedContent).toContain('Wohnung 2A');
      expect(result.processedContent).toContain('85 m²');
      expect(result.processedContent).toContain('Musterhaus');
      expect(result.processedContent).toContain('Musterstraße 123');
      expect(result.processedContent).toContain('Berlin');
      expect(result.processedContent).toContain('1.200,00\u00A0€');
      expect(result.processedContent).toContain('225,50\u00A0€'); // Sum of nebenkosten
      expect(result.processedContent).toContain('09.02.2024');
      expect(result.processedContent).toContain('Anna Vermieter');
      expect(result.processedContent).toContain('anna@vermieter.de');
    });
    
    it('should handle missing context gracefully with fallback text', () => {
      const template = 'Mieter: @mieter.name, Wohnung: @wohnung.name';
      const emptyContext: TemplateContext = { datum: new Date() };
      
      const result = processor.processTemplate(template, emptyContext);
      
      expect(result.success).toBe(true);
      expect(result.unresolvedPlaceholders).toEqual(expect.arrayContaining(['@mieter.name', '@wohnung.name']));
      expect(result.unresolvedPlaceholders).toHaveLength(2);
      expect(result.processedContent).toContain('[Mieter Name]');
      expect(result.processedContent).toContain('[Wohnung Bezeichnung]');
    });
    
    it('should handle unknown placeholders with fallback text', () => {
      const template = 'Unknown: @unknown.placeholder';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.unresolvedPlaceholders).toEqual(['@unknown.placeholder']);
      expect(result.processedContent).toContain('[@unknown.placeholder]');
    });
    
    it('should process date placeholders correctly', () => {
      const template = '@datum @datum.lang @monat @monat.name @jahr';
      const context: TemplateContext = {
        datum: new Date('2024-02-09T10:00:00Z')
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.success).toBe(true);
      expect(result.processedContent).toContain('09.02.2024');
      expect(result.processedContent).toContain('09. Februar 2024');
      expect(result.processedContent).toContain('2');
      expect(result.processedContent).toContain('Februar');
      expect(result.processedContent).toContain('2024');
    });
    
    it('should handle multiple occurrences of the same placeholder', () => {
      const template = '@mieter.name ist der Mieter. @mieter.name wohnt hier.';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.processedContent).toBe('Max Mustermann ist der Mieter. Max Mustermann wohnt hier.');
    });
    
    it('should handle templates with no placeholders', () => {
      const template = 'Dies ist ein normaler Text ohne Platzhalter.';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.unresolvedPlaceholders).toHaveLength(0);
      expect(result.processedContent).toBe(template);
    });
    
    it('should handle empty template', () => {
      const template = '';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.unresolvedPlaceholders).toHaveLength(0);
      expect(result.processedContent).toBe('');
    });
  });
  
  describe('date placeholder resolution', () => {
    it('should format dates correctly in German locale', () => {
      const template = '@datum @datum.lang';
      const context: TemplateContext = {
        datum: new Date('2024-12-25T10:00:00Z')
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.processedContent).toContain('25.12.2024');
      expect(result.processedContent).toContain('25. Dezember 2024');
    });
    
    it('should handle month and year placeholders', () => {
      const template = 'Monat: @monat, Name: @monat.name, Jahr: @jahr';
      const context: TemplateContext = {
        datum: new Date('2024-07-15T10:00:00Z')
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.processedContent).toContain('Monat: 7');
      expect(result.processedContent).toContain('Name: Juli');
      expect(result.processedContent).toContain('Jahr: 2024');
    });
  });
  
  describe('tenant placeholder resolution', () => {
    it('should resolve all tenant placeholders', () => {
      const template = '@mieter.name @mieter.email @mieter.telefon @mieter.einzug @mieter.auszug @mieter.nebenkosten';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.processedContent).toContain('Max Mustermann');
      expect(result.processedContent).toContain('max@example.com');
      expect(result.processedContent).toContain('+49 123 456789');
      expect(result.processedContent).toContain('15.01.2023');
      expect(result.processedContent).toContain('31.12.2024');
      expect(result.processedContent).toContain('225,50\u00A0€');
    });
    
    it('should handle missing tenant data', () => {
      const template = '@mieter.name @mieter.email';
      const contextWithoutTenant: TemplateContext = { datum: new Date() };
      
      const result = processor.processTemplate(template, contextWithoutTenant);
      
      expect(result.unresolvedPlaceholders).toContain('@mieter.name');
      expect(result.unresolvedPlaceholders).toContain('@mieter.email');
      expect(result.processedContent).toContain('[Mieter Name]');
      expect(result.processedContent).toContain('[Mieter E-Mail]');
    });
    
    it('should handle tenant with missing optional fields', () => {
      const template = '@mieter.name @mieter.email @mieter.telefon';
      const tenantWithMissingFields: Tenant = {
        id: 'tenant-1',
        name: 'John Doe'
        // email and telefonnummer are missing
      };
      
      const context: TemplateContext = {
        mieter: tenantWithMissingFields,
        datum: new Date()
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.processedContent).toContain('John Doe');
      expect(result.processedContent).toContain('[Mieter E-Mail]');
      expect(result.processedContent).toContain('[Mieter Telefon]');
    });
  });
  
  describe('apartment placeholder resolution', () => {
    it('should resolve all apartment placeholders', () => {
      const template = '@wohnung.name @wohnung.adresse @wohnung.nummer @wohnung.groesse @wohnung.miete';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.processedContent).toContain('Wohnung 2A');
      expect(result.processedContent).toContain('Wohnung 2A, Musterstraße 123, Berlin');
      expect(result.processedContent).toContain('85 m²');
      expect(result.processedContent).toContain('1.200,00\u00A0€');
    });
    
    it('should handle apartment without house information', () => {
      const template = '@wohnung.adresse';
      const apartmentWithoutHouse: Apartment = {
        id: 'apartment-1',
        name: 'Apartment 1',
        groesse: 50,
        miete: 800,
        status: 'frei',
        Haeuser: null
      };
      
      const context: TemplateContext = {
        wohnung: apartmentWithoutHouse,
        datum: new Date()
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.processedContent).toContain('Apartment 1');
    });
  });
  
  describe('house placeholder resolution', () => {
    it('should resolve all house placeholders', () => {
      const template = '@haus.name @haus.ort @haus.strasse @haus.groesse';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.processedContent).toContain('Musterhaus');
      expect(result.processedContent).toContain('Berlin');
      expect(result.processedContent).toContain('Musterstraße 123');
      expect(result.processedContent).toContain('450');
    });
  });
  
  describe('landlord placeholder resolution', () => {
    it('should resolve landlord placeholders', () => {
      const template = '@vermieter.name @vermieter.email';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.processedContent).toContain('Anna Vermieter');
      expect(result.processedContent).toContain('anna@vermieter.de');
    });
  });
  
  describe('validateContext', () => {
    it('should validate that required context is available', () => {
      const template = '@mieter.name @wohnung.name @haus.name';
      
      const validation = processor.validateContext(template, mockContext);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingContext).toHaveLength(0);
    });
    
    it('should detect missing required context', () => {
      const template = '@mieter.name @wohnung.name @haus.name';
      const incompleteContext: TemplateContext = {
        mieter: mockContext.mieter,
        datum: new Date()
        // wohnung and haus are missing
      };
      
      const validation = processor.validateContext(template, incompleteContext);
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingContext).toContain('Wohnung');
      expect(validation.missingContext).toContain('Haus');
    });
    
    it('should handle templates with no context requirements', () => {
      const template = '@datum @vermieter.name';
      const minimalContext: TemplateContext = {
        vermieter: mockContext.vermieter,
        datum: new Date()
      };
      
      const validation = processor.validateContext(template, minimalContext);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingContext).toHaveLength(0);
    });
  });
  
  describe('getUsedPlaceholders', () => {
    it('should extract all placeholders from template', () => {
      const template = '@mieter.name wohnt in @wohnung.name seit @mieter.einzug';
      
      const placeholders = processor.getUsedPlaceholders(template);
      
      expect(placeholders).toHaveLength(3);
      expect(placeholders.map(p => p.key)).toContain('@mieter.name');
      expect(placeholders.map(p => p.key)).toContain('@wohnung.name');
      expect(placeholders.map(p => p.key)).toContain('@mieter.einzug');
    });
    
    it('should handle duplicate placeholders', () => {
      const template = '@mieter.name ist @mieter.name';
      
      const placeholders = processor.getUsedPlaceholders(template);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].key).toBe('@mieter.name');
    });
    
    it('should return empty array for template without placeholders', () => {
      const template = 'No placeholders here';
      
      const placeholders = processor.getUsedPlaceholders(template);
      
      expect(placeholders).toHaveLength(0);
    });
  });
  
  describe('error handling', () => {
    it('should handle processing errors gracefully', () => {
      // Mock a scenario that could cause an error
      const processor = new TemplateProcessor([]);
      const template = '@invalid.placeholder';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.success).toBe(true); // Should still succeed with fallback
      expect(result.unresolvedPlaceholders).toContain('@invalid.placeholder');
    });
  });
  
  describe('currency and number formatting', () => {
    it('should format currency values correctly', () => {
      const template = '@wohnung.miete @mieter.nebenkosten';
      
      const result = processor.processTemplate(template, mockContext);
      
      expect(result.processedContent).toContain('1.200,00\u00A0€'); // \u00A0 is non-breaking space
      expect(result.processedContent).toContain('225,50\u00A0€');
    });
    
    it('should handle zero and negative values', () => {
      const template = '@wohnung.miete';
      const apartmentWithZeroRent: Apartment = {
        ...mockContext.wohnung!,
        miete: 0
      };
      
      const context: TemplateContext = {
        ...mockContext,
        wohnung: apartmentWithZeroRent
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.processedContent).toContain('0,00\u00A0€');
    });
  });
  
  describe('date formatting edge cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const template = '@mieter.einzug';
      const tenantWithInvalidDate: Tenant = {
        ...mockContext.mieter!,
        einzug: 'invalid-date'
      };
      
      const context: TemplateContext = {
        ...mockContext,
        mieter: tenantWithInvalidDate
      };
      
      const result = processor.processTemplate(template, context);
      
      expect(result.processedContent).toContain('invalid-date'); // Should return original
    });
  });
});