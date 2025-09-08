/**
 * Template Validation Tests
 * Tests for comprehensive template validation system
 */

import { 
  templateValidator, 
  placeholderValidator,
  TemplateSecurityValidator,
  TemplateBusinessValidator,
  templateCreateSchema,
  templateUsageSchema
} from '@/lib/template-system/template-validation';
import type { Template, TemplateContext } from '@/types/template-system';

describe('Template Validation System', () => {
  describe('Schema Validation', () => {
    describe('templateCreateSchema', () => {
      it('should validate valid template creation data', () => {
        const validData = {
          titel: 'Test Template',
          inhalt: 'Hello @mieter.name, your rent is @wohnung.miete',
          kategorie: 'mail',
          kontext_anforderungen: ['mieter', 'wohnung']
        };

        const result = templateCreateSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject empty template name', () => {
        const invalidData = {
          titel: '',
          inhalt: 'Content',
          kategorie: 'mail',
          kontext_anforderungen: []
        };

        const result = templateCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.errors[0].message).toContain('Template-Name ist erforderlich');
      });

      it('should reject template name with invalid characters', () => {
        const invalidData = {
          titel: 'Test<script>alert("xss")</script>',
          inhalt: 'Content',
          kategorie: 'mail',
          kontext_anforderungen: []
        };

        const result = templateCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.errors[0].message).toContain('ungültige Zeichen');
      });

      it('should reject template name containing script references', () => {
        const invalidData = {
          titel: 'Test Script Template',
          inhalt: 'Content',
          kategorie: 'mail',
          kontext_anforderungen: []
        };

        const result = templateCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.errors[0].message).toContain('Skript-Referenzen');
      });

      it('should reject content with script tags', () => {
        const invalidData = {
          titel: 'Test Template',
          inhalt: 'Hello <script>alert("xss")</script> @mieter.name',
          kategorie: 'mail',
          kontext_anforderungen: []
        };

        const result = templateCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.errors[0].message).toContain('Skript-Tags');
      });

      it('should reject invalid category', () => {
        const invalidData = {
          titel: 'Test Template',
          inhalt: 'Content',
          kategorie: 'invalid_category',
          kontext_anforderungen: []
        };

        const result = templateCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.errors[0].message).toContain('Ungültige Kategorie');
      });
    });

    describe('templateUsageSchema', () => {
      it('should validate valid usage data', () => {
        const validData = {
          template_id: '123e4567-e89b-12d3-a456-426614174000',
          mieter_id: '123e4567-e89b-12d3-a456-426614174001',
          wohnung_id: '123e4567-e89b-12d3-a456-426614174002'
        };

        const result = templateUsageSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const invalidData = {
          template_id: 'invalid-uuid',
          mieter_id: '123e4567-e89b-12d3-a456-426614174001'
        };

        const result = templateUsageSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        expect(result.error?.errors[0].message).toContain('Ungültige Template-ID');
      });
    });
  });

  describe('Placeholder Validation', () => {
    it('should validate correct placeholder syntax', () => {
      const content = 'Hello @mieter.name, your rent is @wohnung.miete on @datum';
      const result = placeholderValidator.validatePlaceholderSyntax(content);

      expect(result.isValid).toBe(true);
      expect(result.placeholders).toContain('@mieter.name');
      expect(result.placeholders).toContain('@wohnung.miete');
      expect(result.placeholders).toContain('@datum');
    });

    it('should detect malformed placeholders', () => {
      const content = 'Hello @123invalid and @-also-invalid';
      const result = placeholderValidator.validatePlaceholderSyntax(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Ungültiger Platzhalter');
    });

    it('should detect unknown placeholders', () => {
      const content = 'Hello @unknown.placeholder';
      const result = placeholderValidator.validatePlaceholderSyntax(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unbekannter Platzhalter');
    });

    it('should suggest similar placeholders for typos', () => {
      const content = 'Hello @mieter.namee'; // typo: namee instead of name
      const result = placeholderValidator.validatePlaceholderSyntax(content);
      
      // The placeholder should be detected and suggestions provided as warnings
      expect(result.placeholders).toContain('@mieter.namee');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Meinten Sie');
      expect(result.warnings[0]).toContain('@mieter.name');
    });

    it('should detect incomplete placeholders', () => {
      const content = 'Hello @ and @';
      const result = placeholderValidator.validatePlaceholderSyntax(content);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Unvollständiger Platzhalter');
    });

    it('should validate context requirements', () => {
      const placeholders = ['@mieter.name', '@wohnung.adresse'];
      const availableContext = ['mieter']; // missing wohnung context

      const result = placeholderValidator.validateContextRequirements(
        placeholders,
        availableContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Fehlende Kontext-Anforderungen');
      expect(result.errors[0]).toContain('wohnung');
    });
  });

  describe('Security Validation', () => {
    it('should detect script tags', () => {
      const content = 'Hello <script>alert("xss")</script> @mieter.name';
      const result = TemplateSecurityValidator.validateSecurity(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('potentiell gefährlichen Code');
    });

    it('should detect iframe tags', () => {
      const content = 'Hello <iframe src="evil.com"></iframe> @mieter.name';
      const result = TemplateSecurityValidator.validateSecurity(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('potentiell gefährlichen Code');
    });

    it('should detect javascript URLs', () => {
      const content = 'Click <a href="javascript:alert(1)">here</a>';
      const result = TemplateSecurityValidator.validateSecurity(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('potentiell gefährlichen Code');
    });

    it('should detect event handlers', () => {
      const content = 'Click <button onclick="alert(1)">here</button>';
      const result = TemplateSecurityValidator.validateSecurity(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('potentiell gefährlichen Code');
    });

    it('should warn about excessive HTML complexity', () => {
      const content = '<div>'.repeat(101) + 'content' + '</div>'.repeat(101);
      const result = TemplateSecurityValidator.validateSecurity(content);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('sehr viele HTML-Tags');
    });

    it('should allow safe content', () => {
      const content = 'Hello @mieter.name, <strong>your rent</strong> is @wohnung.miete';
      const result = TemplateSecurityValidator.validateSecurity(content);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Business Rules Validation', () => {
    it('should warn about missing expected contexts for category', () => {
      const template = {
        kategorie: 'vertrag',
        kontext_anforderungen: ['mieter'], // missing wohnung and haus
        inhalt: 'Contract content'
      };

      const result = TemplateBusinessValidator.validateBusinessRules(template);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('normalerweise folgende Kontexte benötigt');
    });

    it('should warn about very short content', () => {
      const template = {
        inhalt: 'Hi'
      };

      const result = TemplateBusinessValidator.validateBusinessRules(template);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('sehr kurz');
    });

    it('should warn about very long content', () => {
      const template = {
        inhalt: 'x'.repeat(10001)
      };

      const result = TemplateBusinessValidator.validateBusinessRules(template);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('sehr lang');
    });

    it('should warn about missing placeholders', () => {
      const template = {
        inhalt: 'This template has no placeholders'
      };

      const result = TemplateBusinessValidator.validateBusinessRules(template);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('keine Platzhalter');
    });
  });

  describe('Comprehensive Template Validation', () => {
    it('should validate template for creation successfully', async () => {
      const templateData = {
        titel: 'Valid Template',
        inhalt: 'Hello @mieter.name, your rent is @wohnung.miete',
        kategorie: 'mail',
        kontext_anforderungen: ['mieter', 'wohnung']
      };

      const result = await templateValidator.validateForCreation(templateData);

      expect(result.isValid).toBe(true);
      expect(result.placeholders).toContain('@mieter.name');
      expect(result.placeholders).toContain('@wohnung.miete');
    });

    it('should reject template with multiple validation errors', async () => {
      const templateData = {
        titel: '', // empty name
        inhalt: '<script>alert("xss")</script>@unknown.placeholder', // security + unknown placeholder
        kategorie: 'invalid', // invalid category
        kontext_anforderungen: ['invalid_context'] // invalid context
      };

      const result = await templateValidator.validateForCreation(templateData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should validate template for usage successfully', async () => {
      const template: Template = {
        id: '1',
        user_id: 'user1',
        titel: 'Test Template',
        inhalt: 'Hello @mieter.name',
        kategorie: 'mail',
        kontext_anforderungen: ['mieter'],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01'
      };

      const context: TemplateContext = {
        mieter: {
          id: '1',
          name: 'John Doe'
        }
      };

      const result = await templateValidator.validateForUsage(template, context);

      expect(result.isValid).toBe(true);
    });

    it('should reject template usage with missing required context', async () => {
      const template: Template = {
        id: '1',
        user_id: 'user1',
        titel: 'Test Template',
        inhalt: 'Hello @mieter.name, rent: @wohnung.miete',
        kategorie: 'vertrag',
        kontext_anforderungen: ['mieter', 'wohnung'],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01'
      };

      const context: TemplateContext = {
        mieter: {
          id: '1',
          name: 'John Doe'
        }
        // missing wohnung context
      };

      const result = await templateValidator.validateForUsage(template, context);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Fehlende erforderliche Kontexte');
      expect(result.errors[0]).toContain('wohnung');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidData = null;

      const result = await templateValidator.validateForCreation(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // The error message should contain information about the validation failure
      expect(result.errors[0]).toBeDefined();
    });

    it('should handle placeholder validation errors gracefully', () => {
      const invalidContent = null;

      const result = placeholderValidator.validatePlaceholderSyntax(invalidContent as any);
      
      // Should return a valid result object even with invalid input
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.placeholders).toBeDefined();
    });
  });
});