import { TemplateService, OptimisticTemplateService } from '@/lib/template-service';
import { Template, TemplatePayload } from '@/types/template';

// Mock fetch
global.fetch = jest.fn();

const mockTemplate: Template = {
  id: '1',
  titel: 'Test Template',
  inhalt: 'Test Content',
  kategorie: 'Test Category',
  kontext_anforderungen: [],
  user_id: 'user-1',
  erstellungsdatum: new Date().toISOString(),
  aktualisiert_am: new Date().toISOString(),
};

const mockTemplatePayload: TemplatePayload = {
  titel: 'Test Template',
  inhalt: 'Test Content',
  kategorie: 'Test Category',
  kontext_anforderungen: [],
};

describe('TemplateService', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getTemplates', () => {
    it('should fetch templates successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTemplate],
      });

      const templates = await TemplateService.getTemplates();
      expect(templates).toEqual([mockTemplate]);
      expect(fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      await expect(TemplateService.getTemplates()).rejects.toThrow('Internal Server Error');
    });

    it('should handle network errors', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(TemplateService.getTemplates()).rejects.toThrow('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
    });
  });

  describe('getTemplate', () => {
    it('should fetch a single template successfully', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTemplate,
        });

        const template = await TemplateService.getTemplate('1');
        expect(template).toEqual(mockTemplate);
        expect(fetch).toHaveBeenCalledWith('/api/templates/1', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    });

    it('should handle not found errors', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ code: 'NOT_FOUND' }),
        });

        await expect(TemplateService.getTemplate('1')).rejects.toThrow('Vorlage nicht gefunden oder keine Berechtigung.');
    });
  });

  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTemplate,
        });

        const template = await TemplateService.createTemplate(mockTemplatePayload);
        expect(template).toEqual(mockTemplate);
        expect(fetch).toHaveBeenCalledWith('/api/templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mockTemplatePayload),
        });
    });

    it('should handle validation errors', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ code: 'VALIDATION_ERROR', details: ['Invalid title'] }),
        });

        await expect(TemplateService.createTemplate(mockTemplatePayload)).rejects.toThrow('Validierungsfehler: Invalid title');
    });
  });

  describe('updateTemplate', () => {
    it('should update a template successfully', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockTemplate,
        });

        const template = await TemplateService.updateTemplate('1', mockTemplatePayload);
        expect(template).toEqual(mockTemplate);
        expect(fetch).toHaveBeenCalledWith('/api/templates/1', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mockTemplatePayload),
        });
    });

    it('should handle duplicate title errors', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ code: 'DUPLICATE_TITLE' }),
        });

        await expect(TemplateService.updateTemplate('1', mockTemplatePayload)).rejects.toThrow('Eine Vorlage mit diesem Namen existiert bereits.');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template successfully', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
        });

        await TemplateService.deleteTemplate('1');
        expect(fetch).toHaveBeenCalledWith('/api/templates/1', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    });

    it('should handle foreign key constraint errors', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ code: 'FOREIGN_KEY_CONSTRAINT' }),
        });

        await expect(TemplateService.deleteTemplate('1')).rejects.toThrow('Die Vorlage kann nicht gelöscht werden, da sie noch verwendet wird.');
    });
  });
});

describe('OptimisticTemplateService', () => {
  let optimisticService: OptimisticTemplateService;
  let consoleErrorSpy: jest.SpyInstance;
  const mockOptions = {
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    optimisticService = new OptimisticTemplateService(mockOptions);
    (fetch as jest.Mock).mockClear();
    mockOptions.onSuccess.mockClear();
    mockOptions.onError.mockClear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createTemplate', () => {
    it('should optimistically add a template and then update it on success', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

      const createPromise = optimisticService.createTemplate(mockTemplatePayload);

      // Check for optimistic update
      const templates = optimisticService.getTemplates();
      expect(templates.length).toBe(1);
      expect(templates[0].titel).toBe(mockTemplatePayload.titel);
      expect(templates[0].id).toContain('temp-');

      await createPromise;

      // Check for final state
      const finalTemplates = optimisticService.getTemplates();
      expect(finalTemplates.length).toBe(1);
      expect(finalTemplates[0]).toEqual(mockTemplate);
      expect(mockOptions.onSuccess).toHaveBeenCalledWith('Template erfolgreich erstellt');
    });

    it('should remove the optimistic template on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create' }),
      });

      await expect(optimisticService.createTemplate(mockTemplatePayload)).rejects.toThrow('Failed to create');

      // Check for rollback
      const finalTemplates = optimisticService.getTemplates();
      expect(finalTemplates.length).toBe(0);
      expect(mockOptions.onError).toHaveBeenCalledWith('Failed to create');
    });
  });

  describe('updateTemplate', () => {
    beforeEach(() => {
        optimisticService.setTemplates([mockTemplate]);
    });

    it('should optimistically update a template and then finalize on success', async () => {
        const updatedPayload = { ...mockTemplatePayload, titel: 'Updated Title' };
        const updatedTemplate = { ...mockTemplate, titel: 'Updated Title' };

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => updatedTemplate,
        });

        const updatePromise = optimisticService.updateTemplate('1', updatedPayload);

        // Check for optimistic update
        const templates = optimisticService.getTemplates();
        expect(templates[0].titel).toBe('Updated Title');

        await updatePromise;

        // Check for final state
        const finalTemplates = optimisticService.getTemplates();
        expect(finalTemplates[0]).toEqual(updatedTemplate);
        expect(mockOptions.onSuccess).toHaveBeenCalledWith('Template erfolgreich aktualisiert');
    });

    it('should roll back the optimistic update on failure', async () => {
        const updatedPayload = { ...mockTemplatePayload, titel: 'Updated Title' };

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Failed to update' }),
        });

        await expect(optimisticService.updateTemplate('1', updatedPayload)).rejects.toThrow('Failed to update');

        // Check for rollback
        const finalTemplates = optimisticService.getTemplates();
        expect(finalTemplates[0]).toEqual(mockTemplate);
        expect(mockOptions.onError).toHaveBeenCalledWith('Failed to update');
    });
  });

  describe('deleteTemplate', () => {
    beforeEach(() => {
        optimisticService.setTemplates([mockTemplate]);
    });

    it('should optimistically delete a template and finalize on success', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
        });

        const deletePromise = optimisticService.deleteTemplate('1');

        // Check for optimistic update
        const templates = optimisticService.getTemplates();
        expect(templates.length).toBe(0);

        await deletePromise;

        // Check for final state
        const finalTemplates = optimisticService.getTemplates();
        expect(finalTemplates.length).toBe(0);
        expect(mockOptions.onSuccess).toHaveBeenCalledWith('Template erfolgreich gelöscht');
    });

    it('should roll back the optimistic delete on failure', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Failed to delete' }),
        });

        await expect(optimisticService.deleteTemplate('1')).rejects.toThrow('Failed to delete');

        // Check for rollback
        const finalTemplates = optimisticService.getTemplates();
        expect(finalTemplates.length).toBe(1);
        expect(finalTemplates[0]).toEqual(mockTemplate);
        expect(mockOptions.onError).toHaveBeenCalledWith('Failed to delete');
    });
  });
});
