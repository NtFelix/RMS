import { TemplateService, OptimisticTemplateService } from '@/lib/template-service';
import { Template, TemplatePayload } from '@/types/template';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('TemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('fetches templates successfully', async () => {
      const mockTemplates: Template[] = [
        {
          id: '1',
          titel: 'Test Template',
          inhalt: { type: 'doc', content: [] },
          user_id: 'user1',
          kategorie: 'Mail',
          kontext_anforderungen: [],
          erstellungsdatum: '2024-01-01',
          aktualisiert_am: '2024-01-01',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      } as Response);

      const result = await TemplateService.getTemplates();

      expect(mockFetch).toHaveBeenCalledWith('/api/templates', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockTemplates);
    });

    it('handles unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'UNAUTHORIZED', error: 'Unauthorized' }),
      } as Response);

      await expect(TemplateService.getTemplates()).rejects.toThrow(
        'Sitzung abgelaufen. Bitte melden Sie sich erneut an.'
      );
    });

    it('handles database error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'DATABASE_ERROR', error: 'Database error' }),
      } as Response);

      await expect(TemplateService.getTemplates()).rejects.toThrow(
        'Datenbankfehler beim Laden der Vorlagen. Bitte versuchen Sie es später erneut.'
      );
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(TemplateService.getTemplates()).rejects.toThrow(
        'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
      );
    });
  });

  describe('getTemplate', () => {
    it('fetches single template successfully', async () => {
      const mockTemplate: Template = {
        id: '1',
        titel: 'Test Template',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user1',
        kategorie: 'Mail',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      } as Response);

      const result = await TemplateService.getTemplate('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/1', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockTemplate);
    });

    it('handles not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'NOT_FOUND', error: 'Not found' }),
      } as Response);

      await expect(TemplateService.getTemplate('999')).rejects.toThrow(
        'Vorlage nicht gefunden oder keine Berechtigung.'
      );
    });

    it('handles invalid ID error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'INVALID_ID', error: 'Invalid ID' }),
      } as Response);

      await expect(TemplateService.getTemplate('invalid')).rejects.toThrow(
        'Ungültige Vorlagen-ID.'
      );
    });
  });

  describe('createTemplate', () => {
    it('creates template successfully', async () => {
      const templateData: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      const createdTemplate: Template = {
        id: '1',
        ...templateData,
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdTemplate,
      } as Response);

      const result = await TemplateService.createTemplate(templateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      expect(result).toEqual(createdTemplate);
    });

    it('handles validation error', async () => {
      const templateData: TemplatePayload = {
        titel: '',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          code: 'VALIDATION_ERROR',
          error: 'Validation failed',
          details: ['Titel ist erforderlich'],
        }),
      } as Response);

      await expect(TemplateService.createTemplate(templateData)).rejects.toThrow(
        'Validierungsfehler: Titel ist erforderlich'
      );
    });

    it('handles duplicate title error', async () => {
      const templateData: TemplatePayload = {
        titel: 'Existing Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'DUPLICATE_TITLE', error: 'Duplicate title' }),
      } as Response);

      await expect(TemplateService.createTemplate(templateData)).rejects.toThrow(
        'Eine Vorlage mit diesem Namen existiert bereits.'
      );
    });
  });

  describe('updateTemplate', () => {
    it('updates template successfully', async () => {
      const templateData: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      const updatedTemplate: Template = {
        id: '1',
        ...templateData,
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-02',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTemplate,
      } as Response);

      const result = await TemplateService.updateTemplate('1', templateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      expect(result).toEqual(updatedTemplate);
    });

    it('handles not found error on update', async () => {
      const templateData: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'NOT_FOUND', error: 'Not found' }),
      } as Response);

      await expect(TemplateService.updateTemplate('999', templateData)).rejects.toThrow(
        'Vorlage nicht gefunden oder keine Berechtigung.'
      );
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await expect(TemplateService.deleteTemplate('1')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('handles foreign key constraint error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'FOREIGN_KEY_CONSTRAINT', error: 'Constraint violation' }),
      } as Response);

      await expect(TemplateService.deleteTemplate('1')).rejects.toThrow(
        'Die Vorlage kann nicht gelöscht werden, da sie noch verwendet wird.'
      );
    });

    it('handles not found error on delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 'NOT_FOUND', error: 'Not found' }),
      } as Response);

      await expect(TemplateService.deleteTemplate('999')).rejects.toThrow(
        'Vorlage nicht gefunden oder keine Berechtigung.'
      );
    });
  });
});

describe('OptimisticTemplateService', () => {
  let service: OptimisticTemplateService;
  let mockOnSuccess: jest.Mock;
  let mockOnError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSuccess = jest.fn();
    mockOnError = jest.fn();
    service = new OptimisticTemplateService({
      onSuccess: mockOnSuccess,
      onError: mockOnError,
    });

    // Mock TemplateService methods
    jest.spyOn(TemplateService, 'createTemplate').mockImplementation();
    jest.spyOn(TemplateService, 'updateTemplate').mockImplementation();
    jest.spyOn(TemplateService, 'deleteTemplate').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subscription management', () => {
    it('notifies subscribers of changes', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      const templates: Template[] = [
        {
          id: '1',
          titel: 'Test',
          inhalt: { type: 'doc', content: [] },
          user_id: 'user1',
          kategorie: 'Mail',
          kontext_anforderungen: [],
          erstellungsdatum: '2024-01-01',
          aktualisiert_am: '2024-01-01',
        },
      ];

      service.setTemplates(templates);

      expect(listener).toHaveBeenCalled();
      expect(service.getTemplates()).toEqual(templates);

      unsubscribe();
      service.setTemplates([]);
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
    });
  });

  describe('optimistic create', () => {
    it('adds template optimistically and replaces with real one', async () => {
      const templateData: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      const createdTemplate: Template = {
        id: 'real-id',
        ...templateData,
        user_id: 'user1',
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      (TemplateService.createTemplate as jest.Mock).mockResolvedValue(createdTemplate);

      const listener = jest.fn();
      service.subscribe(listener);

      await service.createTemplate(templateData);

      expect(listener).toHaveBeenCalledTimes(2); // Once for optimistic, once for real
      expect(service.getTemplates()).toHaveLength(1);
      expect(service.getTemplates()[0].id).toBe('real-id');
      expect(mockOnSuccess).toHaveBeenCalledWith('Template erfolgreich erstellt');
    });

    it('removes optimistic template on error', async () => {
      const templateData: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      const error = new Error('Creation failed');
      (TemplateService.createTemplate as jest.Mock).mockRejectedValue(error);

      const listener = jest.fn();
      service.subscribe(listener);

      await expect(service.createTemplate(templateData)).rejects.toThrow('Creation failed');

      expect(listener).toHaveBeenCalledTimes(2); // Once for add, once for remove
      expect(service.getTemplates()).toHaveLength(0);
      expect(mockOnError).toHaveBeenCalledWith('Creation failed');
    });
  });

  describe('optimistic update', () => {
    it('updates template optimistically and replaces with real one', async () => {
      const originalTemplate: Template = {
        id: '1',
        titel: 'Original',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user1',
        kategorie: 'Mail',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([originalTemplate]);

      const updateData: TemplatePayload = {
        titel: 'Updated',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      const updatedTemplate: Template = {
        ...originalTemplate,
        ...updateData,
        aktualisiert_am: '2024-01-02',
      };

      (TemplateService.updateTemplate as jest.Mock).mockResolvedValue(updatedTemplate);

      const listener = jest.fn();
      service.subscribe(listener);

      await service.updateTemplate('1', updateData);

      expect(listener).toHaveBeenCalledTimes(2); // Once for optimistic, once for real
      expect(service.getTemplates()[0].titel).toBe('Updated');
      expect(mockOnSuccess).toHaveBeenCalledWith('Template erfolgreich aktualisiert');
    });

    it('rolls back optimistic update on error', async () => {
      const originalTemplate: Template = {
        id: '1',
        titel: 'Original',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user1',
        kategorie: 'Mail',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([originalTemplate]);

      const updateData: TemplatePayload = {
        titel: 'Updated',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      const error = new Error('Update failed');
      (TemplateService.updateTemplate as jest.Mock).mockRejectedValue(error);

      const listener = jest.fn();
      service.subscribe(listener);

      await expect(service.updateTemplate('1', updateData)).rejects.toThrow('Update failed');

      expect(listener).toHaveBeenCalledTimes(2); // Once for optimistic, once for rollback
      expect(service.getTemplates()[0].titel).toBe('Original');
      expect(mockOnError).toHaveBeenCalledWith('Update failed');
    });

    it('throws error when template not found', async () => {
      service.setTemplates([]);

      const updateData: TemplatePayload = {
        titel: 'Updated',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      await expect(service.updateTemplate('999', updateData)).rejects.toThrow(
        'Template nicht gefunden'
      );
    });
  });

  describe('optimistic delete', () => {
    it('removes template optimistically', async () => {
      const template: Template = {
        id: '1',
        titel: 'To Delete',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user1',
        kategorie: 'Mail',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([template]);

      (TemplateService.deleteTemplate as jest.Mock).mockResolvedValue(undefined);

      const listener = jest.fn();
      service.subscribe(listener);

      await service.deleteTemplate('1');

      expect(listener).toHaveBeenCalledTimes(1); // Once for removal
      expect(service.getTemplates()).toHaveLength(0);
      expect(mockOnSuccess).toHaveBeenCalledWith('Template erfolgreich gelöscht');
    });

    it('restores template on delete error', async () => {
      const template: Template = {
        id: '1',
        titel: 'To Delete',
        inhalt: { type: 'doc', content: [] },
        user_id: 'user1',
        kategorie: 'Mail',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-01',
        aktualisiert_am: '2024-01-01',
      };

      service.setTemplates([template]);

      const error = new Error('Delete failed');
      (TemplateService.deleteTemplate as jest.Mock).mockRejectedValue(error);

      const listener = jest.fn();
      service.subscribe(listener);

      await expect(service.deleteTemplate('1')).rejects.toThrow('Delete failed');

      expect(listener).toHaveBeenCalledTimes(2); // Once for removal, once for restore
      expect(service.getTemplates()).toHaveLength(1);
      expect(service.getTemplates()[0].id).toBe('1');
      expect(mockOnError).toHaveBeenCalledWith('Delete failed');
    });

    it('throws error when template not found for deletion', async () => {
      service.setTemplates([]);

      await expect(service.deleteTemplate('999')).rejects.toThrow(
        'Template nicht gefunden'
      );
    });
  });
});