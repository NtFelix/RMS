/**
 * Tests for Template Service
 */

import { TemplateService, OptimisticTemplateService } from '@/lib/template-service';
import { Template, TemplatePayload } from '@/types/template';

// Mock fetch globally
global.fetch = jest.fn();

describe('TemplateService', () => {
  // Suppress expected error logs in tests
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('fetches templates successfully', async () => {
      const mockTemplates: Template[] = [
        {
          id: '1',
          titel: 'Test Template',
          inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
          kategorie: 'Dokumente',
          kontext_anforderungen: [],
          user_id: 'user1',
          erstellungsdatum: '2024-01-01',
          aktualisiert_am: '2024-01-01',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const templates = await TemplateService.getTemplates();
      expect(templates).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', expect.any(Object));
    });

    it('handles unauthorized error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'UNAUTHORIZED', error: 'Unauthorized' }),
      });

      await expect(TemplateService.getTemplates()).rejects.toThrow('Sitzung abgelaufen');
    });

    it('handles network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(TemplateService.getTemplates()).rejects.toThrow('Netzwerkfehler');
    });
  });

  describe('createTemplate', () => {
    it('creates template successfully', async () => {
      const payload: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      const mockTemplate: Template = {
        id: '1',
        ...payload,
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

      const template = await TemplateService.createTemplate(payload);
      expect(template).toEqual(mockTemplate);
    });

    it('handles validation error', async () => {
      const payload: TemplatePayload = {
        titel: '',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ 
          code: 'VALIDATION_ERROR', 
          details: ['Titel ist erforderlich'],
        }),
      });

      await expect(TemplateService.createTemplate(payload)).rejects.toThrow('Validierungsfehler');
    });
  });

  describe('updateTemplate', () => {
    it('updates template successfully', async () => {
      const payload: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Updated Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      const mockTemplate: Template = {
        id: '1',
        ...payload,
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-02',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

      const template = await TemplateService.updateTemplate('1', payload);
      expect(template).toEqual(mockTemplate);
    });

    it('handles not found error', async () => {
      const payload: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'NOT_FOUND', error: 'Not found' }),
      });

      await expect(TemplateService.updateTemplate('999', payload)).rejects.toThrow('nicht gefunden');
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(TemplateService.deleteTemplate('1')).resolves.toBeUndefined();
    });

    it('handles foreign key constraint error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'FOREIGN_KEY_CONSTRAINT', error: 'In use' }),
      });

      await expect(TemplateService.deleteTemplate('1')).rejects.toThrow('noch verwendet');
    });
  });
});

describe('OptimisticTemplateService', () => {
  let service: OptimisticTemplateService;
  let onSuccess: jest.Mock;
  let onError: jest.Mock;
  
  // Suppress expected error logs in tests
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    onSuccess = jest.fn();
    onError = jest.fn();
    service = new OptimisticTemplateService({ onSuccess, onError });
  });

  describe('createTemplate', () => {
    it('adds optimistic template and replaces with real one', async () => {
      const payload: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      const mockTemplate: Template = {
        id: 'real-id',
        ...payload,
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

      await service.createTemplate(payload);

      const templates = service.getTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('real-id');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('removes optimistic template on error', async () => {
      const payload: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'VALIDATION_ERROR', error: 'Invalid' }),
      });

      await expect(service.createTemplate(payload)).rejects.toThrow();

      const templates = service.getTemplates();
      expect(templates).toHaveLength(0);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('updateTemplate', () => {
    it('applies optimistic update and replaces with real one', async () => {
      const existingTemplate: Template = {
        id: '1',
        titel: 'Old Title',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Old Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([existingTemplate]);

      const payload: TemplatePayload = {
        titel: 'New Title',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'New Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      const updatedTemplate: Template = {
        ...existingTemplate,
        ...payload,
        aktualisiert_am: '2024-01-02',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTemplate,
      });

      await service.updateTemplate('1', payload);

      const templates = service.getTemplates();
      expect(templates[0].titel).toBe('New Title');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('rolls back optimistic update on error', async () => {
      const existingTemplate: Template = {
        id: '1',
        titel: 'Old Title',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Old Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([existingTemplate]);

      const payload: TemplatePayload = {
        titel: 'New Title',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'New Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'VALIDATION_ERROR', error: 'Invalid' }),
      });

      await expect(service.updateTemplate('1', payload)).rejects.toThrow();

      const templates = service.getTemplates();
      expect(templates[0].titel).toBe('Old Title');
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('deleteTemplate', () => {
    it('removes template optimistically and keeps removed on success', async () => {
      const existingTemplate: Template = {
        id: '1',
        titel: 'Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([existingTemplate]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deleteTemplate('1');

      const templates = service.getTemplates();
      expect(templates).toHaveLength(0);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('restores template on error', async () => {
      const existingTemplate: Template = {
        id: '1',
        titel: 'Template',
        inhalt: { type: 'doc', content: [{ type: 'text', text: 'Content' }] },
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([existingTemplate]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'FOREIGN_KEY_CONSTRAINT', error: 'In use' }),
      });

      await expect(service.deleteTemplate('1')).rejects.toThrow();

      const templates = service.getTemplates();
      expect(templates).toHaveLength(1);
      expect(onError).toHaveBeenCalled();
    });
  });
});
