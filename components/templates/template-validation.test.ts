import {
  validateTemplate,
  isEmptyTipTapContent,
  extractTextFromTipTap,
  getTemplatePreview,
  validateMentionVariables,
  sanitizeTemplateData,
} from '@/lib/template-validation';
import { TemplatePayload } from '@/types/template';
import { JSONContent } from '@tiptap/react';

describe('Template Validation', () => {
  describe('validateTemplate', () => {
    const validTemplateData: TemplatePayload = {
      titel: 'Valid Template',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Valid content' }],
          },
        ],
      },
      kategorie: 'Mail',
      kontext_anforderungen: [],
    };

    it('validates a correct template', () => {
      const result = validateTemplate(validTemplateData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects template without title', () => {
      const invalidData = { ...validTemplateData, titel: '' };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel ist erforderlich',
      });
    });

    it('rejects template with title too short', () => {
      const invalidData = { ...validTemplateData, titel: 'ab' };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel muss mindestens 3 Zeichen lang sein',
      });
    });

    it('rejects template with title too long', () => {
      const invalidData = { ...validTemplateData, titel: 'a'.repeat(101) };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel darf maximal 100 Zeichen lang sein',
      });
    });

    it('rejects template without content', () => {
      const invalidData = { ...validTemplateData, inhalt: undefined as any };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'inhalt',
        message: 'Inhalt ist erforderlich',
      });
    });

    it('rejects template with empty content', () => {
      const emptyContent: JSONContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      };
      const invalidData = { ...validTemplateData, inhalt: emptyContent };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'inhalt',
        message: 'Inhalt darf nicht leer sein',
      });
    });

    it('rejects template without category', () => {
      const invalidData = { ...validTemplateData, kategorie: undefined as any };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'kategorie',
        message: 'Kategorie ist erforderlich',
      });
    });

    it('rejects template with invalid category', () => {
      const invalidData = { ...validTemplateData, kategorie: 'InvalidCategory' as any };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'kategorie',
        message: 'Ungültige Kategorie',
      });
    });

    it('validates context requirements array', () => {
      const validData = { 
        ...validTemplateData, 
        kontext_anforderungen: ['requirement1', 'requirement2'] 
      };
      const result = validateTemplate(validData);
      
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid context requirements', () => {
      const invalidData = { 
        ...validTemplateData, 
        kontext_anforderungen: 'not an array' as any 
      };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'kontext_anforderungen',
        message: 'Kontext-Anforderungen müssen ein Array sein',
      });
    });

    it('rejects non-string context requirements', () => {
      const invalidData = { 
        ...validTemplateData, 
        kontext_anforderungen: [123, 'valid'] as any 
      };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'kontext_anforderungen',
        message: 'Kontext-Anforderung 1 muss ein String sein',
      });
    });

    it('accumulates multiple validation errors', () => {
      const invalidData: Partial<TemplatePayload> = {
        titel: '',
        inhalt: undefined,
        kategorie: undefined,
      };
      const result = validateTemplate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('isEmptyTipTapContent', () => {
    it('returns true for undefined content', () => {
      expect(isEmptyTipTapContent(undefined as any)).toBe(true);
    });

    it('returns true for content without content array', () => {
      const content: JSONContent = { type: 'doc' };
      expect(isEmptyTipTapContent(content)).toBe(true);
    });

    it('returns true for empty paragraphs', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [] },
          { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
        ],
      };
      expect(isEmptyTipTapContent(content)).toBe(true);
    });

    it('returns false for content with text', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Some content' }],
          },
        ],
      };
      expect(isEmptyTipTapContent(content)).toBe(false);
    });

    it('returns false for non-paragraph content', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 1 } }],
      };
      expect(isEmptyTipTapContent(content)).toBe(false);
    });
  });

  describe('extractTextFromTipTap', () => {
    it('extracts text from simple paragraph', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      };
      expect(extractTextFromTipTap(content)).toBe('Hello world');
    });

    it('extracts text from multiple paragraphs', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      };
      expect(extractTextFromTipTap(content)).toBe('First paragraph Second paragraph');
    });

    it('extracts text from complex structure with mentions', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
              { type: 'text', text: ', welcome!' },
            ],
          },
        ],
      };
      expect(extractTextFromTipTap(content)).toBe('Hello , welcome!');
    });

    it('returns empty string for empty content', () => {
      const content: JSONContent = { type: 'doc', content: [] };
      expect(extractTextFromTipTap(content)).toBe('');
    });

    it('handles undefined content', () => {
      expect(extractTextFromTipTap(undefined as any)).toBe('');
    });
  });

  describe('getTemplatePreview', () => {
    it('returns full text when under limit', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Short text' }],
          },
        ],
      };
      expect(getTemplatePreview(content, 50)).toBe('Short text');
    });

    it('truncates long text with ellipsis', () => {
      const longText = 'This is a very long text that should be truncated';
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: longText }],
          },
        ],
      };
      const preview = getTemplatePreview(content, 20);
      expect(preview).toBe('This is a very long...');
      expect(preview.length).toBe(22); // 19 chars + '...'
    });

    it('uses default max length', () => {
      const longText = 'a'.repeat(200);
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: longText }],
          },
        ],
      };
      const preview = getTemplatePreview(content);
      expect(preview.length).toBe(153); // 150 + '...'
    });
  });

  describe('validateMentionVariables', () => {
    it('validates content with valid mentions', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
              { type: 'text', text: ' at ' },
              { type: 'mention', attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' } },
            ],
          },
        ],
      };
      
      const result = validateMentionVariables(content);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects content with invalid mentions', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'invalid.variable', label: '@Invalid.Variable' } },
            ],
          },
        ],
      };
      
      const result = validateMentionVariables(content);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'inhalt',
        message: 'Ungültige Mention-Variable: invalid.variable',
      });
    });

    it('validates nested content structures', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'mention', attrs: { id: 'datum.heute', label: '@Datum.Heute' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      
      const result = validateMentionVariables(content);
      expect(result.isValid).toBe(true);
    });

    it('handles content without mentions', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'No mentions here' }],
          },
        ],
      };
      
      const result = validateMentionVariables(content);
      expect(result.isValid).toBe(true);
    });

    it('handles empty content', () => {
      const content: JSONContent = { type: 'doc', content: [] };
      const result = validateMentionVariables(content);
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeTemplateData', () => {
    it('trims whitespace from title', () => {
      const data: TemplatePayload = {
        titel: '  Template Title  ',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: ['req1'],
      };
      
      const sanitized = sanitizeTemplateData(data);
      expect(sanitized.titel).toBe('Template Title');
    });

    it('preserves content structure', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content' }],
          },
        ],
      };
      
      const data: TemplatePayload = {
        titel: 'Title',
        inhalt: content,
        kategorie: 'Mail',
        kontext_anforderungen: ['req1'],
      };
      
      const sanitized = sanitizeTemplateData(data);
      expect(sanitized.inhalt).toEqual(content);
    });

    it('provides default empty array for context requirements', () => {
      const data: TemplatePayload = {
        titel: 'Title',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: undefined as any,
      };
      
      const sanitized = sanitizeTemplateData(data);
      expect(sanitized.kontext_anforderungen).toEqual([]);
    });

    it('preserves existing context requirements', () => {
      const requirements = ['req1', 'req2'];
      const data: TemplatePayload = {
        titel: 'Title',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: requirements,
      };
      
      const sanitized = sanitizeTemplateData(data);
      expect(sanitized.kontext_anforderungen).toEqual(requirements);
    });
  });
});