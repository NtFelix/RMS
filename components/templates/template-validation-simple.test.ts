import { validateTemplate, validateMentionVariables, isEmptyTipTapContent } from '@/lib/template-validation';

describe('Template Validation Functions', () => {
  describe('validateTemplate', () => {
    test('should validate a correct template', () => {
      const validTemplate = {
        titel: 'Test Template',
        inhalt: { 
          type: 'doc', 
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'Hello World' }] 
          }] 
        },
        kategorie: 'Mail' as const,
        kontext_anforderungen: [],
      };

      const result = validateTemplate(validTemplate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject template with empty title', () => {
      const invalidTemplate = {
        titel: '',
        inhalt: { 
          type: 'doc', 
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'Hello World' }] 
          }] 
        },
        kategorie: 'Mail' as const,
        kontext_anforderungen: [],
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel ist erforderlich',
      });
    });

    test('should reject template with short title', () => {
      const invalidTemplate = {
        titel: 'ab',
        inhalt: { 
          type: 'doc', 
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'Hello World' }] 
          }] 
        },
        kategorie: 'Mail' as const,
        kontext_anforderungen: [],
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel muss mindestens 3 Zeichen lang sein',
      });
    });

    test('should reject template with long title', () => {
      const longTitle = 'a'.repeat(101);
      const invalidTemplate = {
        titel: longTitle,
        inhalt: { 
          type: 'doc', 
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'Hello World' }] 
          }] 
        },
        kategorie: 'Mail' as const,
        kontext_anforderungen: [],
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel darf maximal 100 Zeichen lang sein',
      });
    });

    test('should reject template without content', () => {
      const invalidTemplate = {
        titel: 'Test Template',
        inhalt: undefined as any,
        kategorie: 'Mail' as const,
        kontext_anforderungen: [],
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'inhalt',
        message: 'Inhalt ist erforderlich',
      });
    });
  });

  describe('isEmptyTipTapContent', () => {
    test('should detect empty content', () => {
      const emptyContent = {
        type: 'doc',
        content: []
      };

      expect(isEmptyTipTapContent(emptyContent)).toBe(true);
    });

    test('should detect content with empty paragraphs', () => {
      const emptyParagraphContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: []
          }
        ]
      };

      expect(isEmptyTipTapContent(emptyParagraphContent)).toBe(true);
    });

    test('should detect content with only whitespace', () => {
      const whitespaceContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '   '
              }
            ]
          }
        ]
      };

      expect(isEmptyTipTapContent(whitespaceContent)).toBe(true);
    });

    test('should detect non-empty content', () => {
      const nonEmptyContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello World'
              }
            ]
          }
        ]
      };

      expect(isEmptyTipTapContent(nonEmptyContent)).toBe(false);
    });
  });

  describe('validateMentionVariables', () => {
    test('should accept valid mention variables', () => {
      const contentWithValidMention = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'mieter.name',
                  label: 'Mieter.Name'
                }
              }
            ]
          }
        ]
      };

      const result = validateMentionVariables(contentWithValidMention);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid mention variables', () => {
      const contentWithInvalidMention = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'invalid.variable',
                  label: 'Invalid.Variable'
                }
              }
            ]
          }
        ]
      };

      const result = validateMentionVariables(contentWithInvalidMention);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'inhalt',
        message: 'Ungültige Mention-Variable: invalid.variable',
      });
    });

    test('should handle content without mentions', () => {
      const contentWithoutMentions = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Regular text content'
              }
            ]
          }
        ]
      };

      const result = validateMentionVariables(contentWithoutMentions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});