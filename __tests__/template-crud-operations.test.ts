import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TemplateService, OptimisticTemplateService } from '@/lib/template-service';
import { validateTemplate, sanitizeTemplateData, extractTextFromTipTap } from '@/lib/template-validation';
import { Template, TemplatePayload } from '@/types/template';
import { JSONContent } from '@tiptap/react';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Template CRUD Operations', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TemplateService', () => {
    const mockTemplate: Template = {
      id: '123',
      titel: 'Test Template',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'mieter.name', label: 'Mieter.Name' } },
              { type: 'text', text: '!' }
            ]
          }
        ]
      },
      kategorie: 'Mail',
      kontext_anforderungen: ['mieter'],
      user_id: 'user-123',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    };

    it('should fetch all templates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTemplate]
      } as Response);

      const templates = await TemplateService.getTemplates();

      expect(mockFetch).toHaveBeenCalledWith('/api/templates', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(templates).toEqual([mockTemplate]);
    });

    it('should fetch a single template', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      } as Response);

      const template = await TemplateService.getTemplate('123');

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/123', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(template).toEqual(mockTemplate);
    });

    it('should create a new template', async () => {
      const templatePayload: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTemplate, ...templatePayload })
      } as Response);

      const result = await TemplateService.createTemplate(templatePayload);

      expect(mockFetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templatePayload)
      });
      expect(result.titel).toBe(templatePayload.titel);
    });

    it('should update a template', async () => {
      const templatePayload: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Vertrag',
        kontext_anforderungen: ['wohnung']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTemplate, ...templatePayload })
      } as Response);

      const result = await TemplateService.updateTemplate('123', templatePayload);

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templatePayload)
      });
      expect(result.titel).toBe(templatePayload.titel);
    });

    it('should delete a template', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Template gelöscht' })
      } as Response);

      await TemplateService.deleteTemplate('123');

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/123', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Template nicht gefunden' })
      } as Response);

      await expect(TemplateService.getTemplate('invalid')).rejects.toThrow('Template nicht gefunden');
    });
  });

  describe('OptimisticTemplateService', () => {
    let service: OptimisticTemplateService;
    let onSuccess: jest.Mock;
    let onError: jest.Mock;

    beforeEach(() => {
      onSuccess = jest.fn();
      onError = jest.fn();
      service = new OptimisticTemplateService({ onSuccess, onError });
    });

    it('should handle optimistic create', async () => {
      const templatePayload: TemplatePayload = {
        titel: 'Optimistic Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'real-123', ...templatePayload })
      } as Response);

      // Initially empty
      expect(service.getTemplates()).toHaveLength(0);

      const createPromise = service.createTemplate(templatePayload);

      // Should have optimistic template immediately
      expect(service.getTemplates()).toHaveLength(1);
      expect(service.getTemplates()[0].titel).toBe(templatePayload.titel);
      expect(service.getTemplates()[0].id).toMatch(/^temp-/);

      await createPromise;

      // Should have real template after API call
      expect(service.getTemplates()).toHaveLength(1);
      expect(service.getTemplates()[0].id).toBe('real-123');
      expect(onSuccess).toHaveBeenCalledWith('Template erfolgreich erstellt');
    });

    it('should rollback optimistic create on error', async () => {
      const templatePayload: TemplatePayload = {
        titel: 'Failed Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' })
      } as Response);

      expect(service.getTemplates()).toHaveLength(0);

      try {
        await service.createTemplate(templatePayload);
      } catch (error) {
        // Expected to throw
      }

      // Should be empty after rollback
      expect(service.getTemplates()).toHaveLength(0);
      expect(onError).toHaveBeenCalledWith('Validation failed');
    });
  });

  describe('Template Validation', () => {
    it('should validate valid template data', () => {
      const validTemplate: TemplatePayload = {
        titel: 'Valid Template',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Some content' }]
            }
          ]
        },
        kategorie: 'Mail',
        kontext_anforderungen: ['mieter']
      };

      const result = validateTemplate(validTemplate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject template with missing title', () => {
      const invalidTemplate: Partial<TemplatePayload> = {
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: []
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel ist erforderlich'
      });
    });

    it('should reject template with short title', () => {
      const invalidTemplate: TemplatePayload = {
        titel: 'Hi',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: []
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'titel',
        message: 'Titel muss mindestens 3 Zeichen lang sein'
      });
    });

    it('should reject template with invalid category', () => {
      const invalidTemplate: any = {
        titel: 'Valid Title',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'InvalidCategory',
        kontext_anforderungen: []
      };

      const result = validateTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'kategorie',
        message: 'Ungültige Kategorie'
      });
    });

    it('should sanitize template data', () => {
      const dirtyTemplate: TemplatePayload = {
        titel: '  Dirty Title  ',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: []
      };

      const sanitized = sanitizeTemplateData(dirtyTemplate);
      expect(sanitized.titel).toBe('Dirty Title');
    });
  });

  describe('Text Extraction', () => {
    it('should extract text from TipTap content', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'mention', attrs: { id: 'mieter.name' } },
              { type: 'text', text: ', welcome!' }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is a test.' }
            ]
          }
        ]
      };

      const text = extractTextFromTipTap(content);
      expect(text).toBe('Hello , welcome! This is a test.');
    });

    it('should handle empty content', () => {
      const emptyContent: JSONContent = { type: 'doc', content: [] };
      const text = extractTextFromTipTap(emptyContent);
      expect(text).toBe('');
    });
  });
});