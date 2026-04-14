import { TemplateService, OptimisticTemplateService } from './template-service';
import { Template, TemplatePayload } from '@/types/template';

// Mock global fetch
global.fetch = jest.fn();

describe('TemplateService', () => {
  const mockTemplate: Template = {
    id: '1',
    titel: 'Test Template',
    inhalt: { type: 'doc', content: [] },
    user_id: 'user-1',
    kategorie: 'allgemein',
    kontext_anforderungen: [],
    erstellungsdatum: '2024-01-01',
    aktualisiert_am: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('returns templates on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [mockTemplate],
      });

      const result = await TemplateService.getTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].titel).toBe('Test Template');
    });

    it('throws localized error on UNAUTHORIZED', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ code: 'UNAUTHORIZED' }),
      });

      await expect(TemplateService.getTemplates()).rejects.toThrow('Sitzung abgelaufen');
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(TemplateService.getTemplates()).rejects.toThrow('Netzwerkfehler');
    });
  });

  describe('createTemplate', () => {
    it('sends POST request with correct body', async () => {
      const payload: TemplatePayload = {
        titel: 'New',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'allgemein',
        kontext_anforderungen: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockTemplate, titel: 'New' }),
      });

      const result = await TemplateService.createTemplate(payload);

      expect(global.fetch).toHaveBeenCalledWith('/api/templates', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }));
      expect(result.titel).toBe('New');
    });

    it('throws validation error with details', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ code: 'VALIDATION_ERROR', details: ['Missing title'] }),
      });

      await expect(TemplateService.createTemplate({} as any)).rejects.toThrow('Validierungsfehler: Missing title');
    });
  });
});

describe('OptimisticTemplateService', () => {
  let service: OptimisticTemplateService;
  const mockOptions = {
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OptimisticTemplateService(mockOptions);
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('updates state optimistically on create', async () => {
    const payload: TemplatePayload = {
      titel: 'Optimistic',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'allgemein',
      kontext_anforderungen: [],
    };

    // Mock the actual API call to be delayed
    let resolveApi: any;
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    jest.spyOn(TemplateService, 'createTemplate').mockReturnValue(apiPromise as any);

    const createPromise = service.createTemplate(payload);

    // Should have optimistic template now
    expect(service.getTemplates()).toHaveLength(1);
    expect(service.getTemplates()[0].id).toMatch(/^temp-/);
    expect(service.getTemplates()[0].titel).toBe('Optimistic');

    // Resolve API
    const realTemplate = { id: 'real-1', ...payload, user_id: 'u1', erstellungsdatum: '', aktualisiert_am: '' };
    resolveApi(realTemplate);
    await createPromise;

    // Should have real template now
    expect(service.getTemplates()[0].id).toBe('real-1');
    expect(mockOptions.onSuccess).toHaveBeenCalled();
  });

  it('rolls back state on create error', async () => {
    jest.spyOn(TemplateService, 'createTemplate').mockRejectedValue(new Error('Server Error'));

    try {
      await service.createTemplate({ titel: 'Fail' } as any);
    } catch (e) {
      // Expected
    }

    expect(service.getTemplates()).toHaveLength(0);
    expect(mockOptions.onError).toHaveBeenCalledWith('Server Error');
  });

  it('updates state optimistically on delete', async () => {
    const initialTemplate = { id: '1', titel: 'Initial', inhalt: {}, kategorie: 'allgemein', aktualisiert_am: new Date().toISOString() } as any;
    service.setTemplates([initialTemplate]);

    jest.spyOn(TemplateService, 'deleteTemplate').mockResolvedValue(undefined);

    await service.deleteTemplate('1');

    expect(service.getTemplates()).toHaveLength(0);
    expect(mockOptions.onSuccess).toHaveBeenCalled();
  });

  it('restores state on delete error', async () => {
    const initialTemplate = { id: '1', titel: 'Initial', inhalt: {}, kategorie: 'allgemein', aktualisiert_am: new Date().toISOString() } as any;
    service.setTemplates([initialTemplate]);

    jest.spyOn(TemplateService, 'deleteTemplate').mockRejectedValue(new Error('Delete Failed'));

    try {
      await service.deleteTemplate('1');
    } catch (e) {
      // Expected
    }

    expect(service.getTemplates()).toHaveLength(1);
    expect(service.getTemplates()[0].id).toBe('1');
    expect(mockOptions.onError).toHaveBeenCalled();
  });

  it('notifies subscribers on change', () => {
    const listener = jest.fn();
    service.subscribe(listener);

    service.setTemplates([]);
    expect(listener).toHaveBeenCalled();
  });
});
